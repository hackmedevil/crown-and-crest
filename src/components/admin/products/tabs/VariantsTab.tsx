"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useCSRFToken } from "@/hooks/useCSRFToken";
import VariantImageSelector from "@/components/admin/products/VariantImageSelector";

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

type SizeVariantRow = {
  id: string;
  size: string;
  sku: string;
  stock_quantity: number;
  price_adjustment: number;
  enabled: boolean;
  isSaving?: boolean;
};

type ColorGroupRow = {
  id?: string; // undefined if not yet created
  color_id: string;
  color_name: string;
  hex_code: string;
  enabled: boolean;
  position: number;
  images: string[];
  size_variants: SizeVariantRow[];
};

type GeneratedColorGroup = {
  id: string;
  color_name: string;
  hex_code: string;
  enabled: boolean;
  sizes: Array<{
    id: string;
    size: string;
    sku: string;
    stock_quantity: number;
    price_adjustment: number;
    enabled: boolean;
  }>;
};

type ColorItem = {
  id: string;
  name: string;
  hex_code: string;
  is_active: boolean;
};

type ColorProfile = {
  id: string;
  name: string;
  colors: ColorItem[];
};

type SizeProfile = {
  id: string;
  name: string;
  sizes: { size: string }[];
};

interface VariantsTabProps {
  productId: string;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

const toErrorMessage = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (value instanceof Error) {
    return value.message || fallback;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return record.message;
    }

    if (typeof record.error === "string" && record.error.trim().length > 0) {
      return record.error;
    }

    if (Array.isArray(record.errors) && record.errors.length > 0) {
      const firstError = record.errors[0];
      return toErrorMessage(firstError, fallback);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const toApiErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    return toErrorMessage(record.message ?? record.error ?? record, fallback);
  }

  return toErrorMessage(data, fallback);
};

const normalizePriceAdjustment = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

const isCsrfFailure = (data: unknown): boolean => {
  if (!data || typeof data !== "object") return false;
  const record = data as Record<string, unknown>;
  const nestedError = record.error as Record<string, unknown> | undefined;
  const code = String(nestedError?.code || "").toUpperCase();
  const message = toApiErrorMessage(data, "").toLowerCase();

  return (
    code === "ERR_CSRF_TOKEN_INVALID" ||
    code === "ERR_CSRF_TOKEN_MISSING" ||
    code === "ERR_CSRF_TOKEN_MISMATCH" ||
    message.includes("csrf")
  );
};

const buildSku = (colorName: string, size: string) => {
  const colorPart = colorName.trim().slice(0, 3).toUpperCase();
  const sizePart = size.trim().slice(0, 2).toUpperCase();
  const random = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `${colorPart}-${sizePart}-${random}`;
};

const cartesian = <T,>(groups: T[][]): T[][] => {
  if (groups.length === 0) return [[]];
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((accItem) => group.map((item) => [...accItem, item])),
    [[]]
  );
};

export default function VariantsTab({ productId }: VariantsTabProps) {
  const { csrfToken } = useCSRFToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [colorGroups, setColorGroups] = useState<ColorGroupRow[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [enableVariantImageSwitching, setEnableVariantImageSwitching] = useState(true);

  const [colorProfiles, setColorProfiles] = useState<ColorProfile[]>([]);
  const [sizeProfiles, setSizeProfiles] = useState<SizeProfile[]>([]);
  const [selectedColorProfileId, setSelectedColorProfileId] = useState<string>("");
  const [selectedSizeProfileId, setSelectedSizeProfileId] = useState<string>("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const [expandedColorGroups, setExpandedColorGroups] = useState<Set<string>>(new Set());

  const [showGenerator, setShowGenerator] = useState(false);
  const [defaultStock, setDefaultStock] = useState(0);
  const [defaultPriceAdjustment, setDefaultPriceAdjustment] = useState(0);
  const [defaultEnabled, setDefaultEnabled] = useState(true);
  const [generatedColorGroups, setGeneratedColorGroups] = useState<GeneratedColorGroup[]>([]);
  const [creatingBulk, setCreatingBulk] = useState(false);

  const [manualColor, setManualColor] = useState("");
  const [manualSize, setManualSize] = useState("");
  const [manualSku, setManualSku] = useState("");
  const [manualStock, setManualStock] = useState(0);
  const [manualPriceAdjustment, setManualPriceAdjustment] = useState(0);
  const [manualEnabled, setManualEnabled] = useState(true);
  const [creatingManual, setCreatingManual] = useState(false);

  const selectedColorProfile = useMemo(
    () => colorProfiles.find((p) => p.id === selectedColorProfileId) || null,
    [colorProfiles, selectedColorProfileId]
  );

  const selectedSizeProfile = useMemo(
    () => sizeProfiles.find((p) => p.id === selectedSizeProfileId) || null,
    [sizeProfiles, selectedSizeProfileId]
  );

  const availableColors = useMemo(
    () => (selectedColorProfile?.colors || []).filter((color) => color.is_active),
    [selectedColorProfile]
  );

  const availableSizes = useMemo(
    () => (selectedSizeProfile?.sizes || []).map((s) => s.size).filter(Boolean),
    [selectedSizeProfile]
  );

  const fetchFreshCsrfToken = async (): Promise<string> => {
    const response = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) return "";

    const payload = await response.json().catch(() => ({}));
    return String(payload?.data?.csrfToken ?? payload?.csrfToken ?? "").trim();
  };

  const requestWithCsrfRetry = async (url: string, init: RequestInit): Promise<Response> => {
    const token = (csrfToken || "").trim() || (await fetchFreshCsrfToken());
    const headers = new Headers(init.headers || {});
    headers.set("X-CSRF-Token", token);

    let response = await fetch(url, { ...init, headers });
    if (response.status !== 403) return response;

    const errorPayload = await response.clone().json().catch(() => null);
    if (!isCsrfFailure(errorPayload)) return response;

    const refreshedToken = await fetchFreshCsrfToken();
    if (!refreshedToken) return response;

    const retryHeaders = new Headers(init.headers || {});
    retryHeaders.set("X-CSRF-Token", refreshedToken);
    response = await fetch(url, { ...init, headers: retryHeaders });
    return response;
  };

  const fetchColorGroups = async () => {
    const response = await fetch(`/api/admin/products/${productId}/variants`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(toApiErrorMessage(data, "Failed to fetch color groups"));
    }

    const payload = await response.json();
    const allVariants = payload?.data?.variants || [];

    // Group variants by color
    const grouped = new Map<string, ColorGroupRow>();

    for (const variant of allVariants) {
      // Find Color attribute
      const attributesArray = (variant.attributes || variant.variant_attributes || []);
      const colorAttr = attributesArray.find((attr: any) => 
        attr.attribute_name?.toLowerCase() === 'color' || attr.name?.toLowerCase() === 'color'
      );
      const sizeAttr = attributesArray.find((attr: any) =>
        attr.attribute_name?.toLowerCase() === 'size' || attr.name?.toLowerCase() === 'size'
      );

      const colorName = colorAttr?.attribute_value || colorAttr?.value || 'Unknown';
      const size = sizeAttr?.attribute_value || sizeAttr?.value || '';

      const colorGroupKey = colorName;

      if (!grouped.has(colorGroupKey)) {
        grouped.set(colorGroupKey, {
          color_id: '',
          color_name: colorName,
          hex_code: '#000000',
          enabled: true,
          position: 0,
          images: [],
          size_variants: [],
        });
      }

      const group = grouped.get(colorGroupKey)!;
      const images = (variant.variant_images || variant.images || [])
        .map((img: any) => (typeof img === "string" ? img : img.image_url))
        .filter(Boolean);

      group.size_variants.push({
        id: variant.id,
        size: size,
        sku: variant.sku || "",
        stock_quantity: Number(variant.stock_quantity || 0),
        price_adjustment: Number(variant.price_override || 0),
        enabled: variant.enabled !== false,
      });

      // Assign images to group (use first variant's images)
      if (group.images.length === 0) {
        group.images = images;
      }
    }

    setColorGroups(Array.from(grouped.values()));
  };

  const fetchProductInfo = async () => {
    const response = await fetch(`/api/admin/products/${productId}`);
    if (!response.ok) return;

    const payload = await response.json();
    const product = payload?.data?.product;
    if (!product) return;

    setBasePrice(Number(product.base_price || 0));
    setEnableVariantImageSwitching(product.enable_variant_image_switching !== false);
  };

  const fetchProductImages = async () => {
    const response = await fetch(`/api/admin/products/${productId}/images`);
    if (!response.ok) {
      setProductImages([]);
      return;
    }

    const payload = await response.json();
    const images = (payload?.images || [])
      .map((img: any) => img.cloudinary_url)
      .filter(Boolean);

    setProductImages(images);
  };

  const fetchProfiles = async () => {
    const [colorRes, sizeRes] = await Promise.all([
      fetch("/api/admin/color-palettes?includeInactive=true"),
      fetch("/api/admin/size-guides"),
    ]);

    if (colorRes.ok) {
      const data = await colorRes.json();
      setColorProfiles(data?.palettes || []);
    }

    if (sizeRes.ok) {
      const data = await sizeRes.json();
      setSizeProfiles(data?.sizeGuides || []);
    }
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchColorGroups(), fetchProductInfo(), fetchProductImages(), fetchProfiles()]);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load variant data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    setSelectedColors((prev) => prev.filter((color) => availableColors.some((c) => c.name === color)));
    setManualColor((prev) => (availableColors.some((c) => c.name === prev) ? prev : ""));
  }, [availableColors]);

  useEffect(() => {
    setSelectedSizes((prev) => prev.filter((size) => availableSizes.includes(size)));
    setManualSize((prev) => (availableSizes.includes(prev) ? prev : ""));
  }, [availableSizes]);

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const generateCombinations = () => {
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      setError("Select at least one color and one size before generating variants.");
      return;
    }

    // Get full color info from profile
    const selectedColorObjects = availableColors.filter((c) => selectedColors.includes(c.name));

    // For each selected color, create a color group with all selected sizes
    const groups: GeneratedColorGroup[] = selectedColorObjects.map((colorItem) => ({
      id: makeId(),
      color_name: colorItem.name,
      hex_code: colorItem.hex_code,
      enabled: defaultEnabled,
      sizes: selectedSizes.map((size) => ({
        id: makeId(),
        size,
        sku: buildSku(colorItem.name, size),
        stock_quantity: defaultStock,
        price_adjustment: defaultPriceAdjustment,
        enabled: defaultEnabled,
      })),
    }));

    setGeneratedColorGroups(groups);
    setError(null);
  };

  const updateGeneratedSize = (
    colorGroupId: string,
    sizeIndex: number,
    field: "sku" | "stock_quantity" | "price_adjustment" | "enabled",
    value: string | boolean
  ) => {
    setGeneratedColorGroups((prev) =>
      prev.map((group) => {
        if (group.id !== colorGroupId) return group;
        return {
          ...group,
          sizes: group.sizes.map((size, idx) => {
            if (idx !== sizeIndex) return size;
            if (field === "stock_quantity") return { ...size, stock_quantity: Number(value) || 0 };
            if (field === "price_adjustment") return { ...size, price_adjustment: normalizePriceAdjustment(value) };
            if (field === "enabled") return { ...size, enabled: Boolean(value) };
            return { ...size, sku: String(value) };
          }),
        };
      })
    );
  };

  const createGeneratedVariants = async () => {
    if (generatedColorGroups.length === 0) {
      setError("Generate color groups first.");
      return;
    }

    setCreatingBulk(true);
    setError(null);

    try {
      for (const colorGroup of generatedColorGroups) {
        // Create variants with Color attribute (still maintaining Color + Size flat structure for now)
        // This allows gradual migration - new variants are generated, old ones remain flat
        for (const sizeVariant of colorGroup.sizes) {
          if (!sizeVariant.sku.trim()) {
            throw new Error("Each variant must have an SKU.");
          }

          const response = await requestWithCsrfRetry(`/api/admin/products/${productId}/variants`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              sku: sizeVariant.sku.trim().toUpperCase(),
              stock_quantity: sizeVariant.stock_quantity,
              price_override: sizeVariant.price_adjustment,
              enabled: sizeVariant.enabled,
              attributes: {
                Color: colorGroup.color_name,
                Size: sizeVariant.size,
              },
              images: [],
            }),
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(toApiErrorMessage(data, "Failed to create one of the variants"));
          }
        }
      }

      setGeneratedColorGroups([]);
      setShowGenerator(false);
      await fetchColorGroups();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to create variants"));
    } finally {
      setCreatingBulk(false);
    }
  };

  const createManualVariant = async () => {
    if (!manualColor || !manualSize) {
      setError("Select both color and size for manual variant creation.");
      return;
    }

    const sku = manualSku.trim() ? manualSku.trim().toUpperCase() : buildSku(manualColor, manualSize);

    setCreatingManual(true);
    setError(null);

    try {
      const response = await requestWithCsrfRetry(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku,
          stock_quantity: manualStock,
          price_override: manualPriceAdjustment,
          enabled: manualEnabled,
          attributes: {
            Color: manualColor,
            Size: manualSize,
          },
          images: [],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Failed to create manual variant"));
      }

      setManualColor("");
      setManualSize("");
      setManualSku("");
      setManualStock(0);
      setManualPriceAdjustment(0);
      setManualEnabled(true);

      await fetchColorGroups();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to create manual variant"));
    } finally {
      setCreatingManual(false);
    }
  };

  const saveVariant = async (variantId: string) => {
    // Find variant across all color groups
    let targetVariant: SizeVariantRow | null = null;
    let targetColorGroup: ColorGroupRow | null = null;

    for (const group of colorGroups) {
      const variant = group.size_variants.find((v) => v.id === variantId);
      if (variant) {
        targetVariant = variant;
        targetColorGroup = group;
        break;
      }
    }

    if (!targetVariant || !targetColorGroup) return;

    setColorGroups((prev) =>
      prev.map((group) =>
        group === targetColorGroup
          ? {
              ...group,
              size_variants: group.size_variants.map((v) =>
                v.id === variantId ? { ...v, isSaving: true } : v
              ),
            }
          : group
      )
    );
    setError(null);

    try {
      const response = await requestWithCsrfRetry(`/api/admin/variants/${variantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: targetVariant.sku.trim().toUpperCase(),
          stock_quantity: targetVariant.stock_quantity,
          price_override: targetVariant.price_adjustment,
          enabled: targetVariant.enabled,
          attributes: {
            Color: targetColorGroup.color_name,
            Size: targetVariant.size,
          },
          images: targetColorGroup.images,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Failed to update variant"));
      }

      await fetchColorGroups();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to update variant"));
      setColorGroups((prev) =>
        prev.map((group) =>
          group === targetColorGroup
            ? {
                ...group,
                size_variants: group.size_variants.map((v) =>
                  v.id === variantId ? { ...v, isSaving: false } : v
                ),
              }
            : group
        )
      );
    }
  };

  const deleteVariant = async (variantId: string) => {
    if (!confirm("Delete this variant?")) return;

    setError(null);
    try {
      const response = await requestWithCsrfRetry(`/api/admin/variants/${variantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Failed to delete variant"));
      }

      await fetchColorGroups();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to delete variant"));
    }
  };

  const updateVariantField = (
    variantId: string,
    field: "sku" | "stock_quantity" | "price_adjustment" | "enabled",
    value: string | boolean
  ) => {
    setColorGroups((prev) =>
      prev.map((group) => ({
        ...group,
        size_variants: group.size_variants.map((variant) => {
          if (variant.id !== variantId) return variant;

          if (field === "stock_quantity") return { ...variant, stock_quantity: Number(value) || 0 };
          if (field === "price_adjustment") return { ...variant, price_adjustment: normalizePriceAdjustment(value) };
          if (field === "enabled") return { ...variant, enabled: Boolean(value) };
          return { ...variant, sku: String(value) };
        }),
      }))
    );
  };

  const updateColorGroupImages = async (colorGroupIndex: number, images: string[]) => {
    // Update local state
    setColorGroups((prev) =>
      prev.map((group, idx) => (idx === colorGroupIndex ? { ...group, images } : group))
    );

    // Update all variants in this color group with new images
    const colorGroup = colorGroups[colorGroupIndex];
    if (!colorGroup) return;

    setError(null);

    try {
      // Batch update all size variants in this color group with the new images
      for (const sizeVariant of colorGroup.size_variants) {
        const response = await requestWithCsrfRetry(`/api/admin/variants/${sizeVariant.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            images,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(toApiErrorMessage(data, "Failed to update color group images"));
        }
      }
    } catch (err) {
      setError(toErrorMessage(err, "Failed to update color group images"));
      // Refresh to revert changes
      await fetchColorGroups();
    }
  };

  const toggleVariantImageSwitching = async (checked: boolean) => {
    setEnableVariantImageSwitching(checked);

    try {
      const response = await requestWithCsrfRetry(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enable_variant_image_switching: checked }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Failed to save variant image switching setting"));
      }
    } catch (err) {
      setEnableVariantImageSwitching((prev) => !prev);
      setError(toErrorMessage(err, "Failed to update variant image switching setting"));
    }
  };

  if (loading) {
    return <div>Loading variants...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Variant Settings</h3>
        <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={enableVariantImageSwitching}
            onChange={(e) => toggleVariantImageSwitching(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Enable Variant Image Switching
        </label>
        <p className="mt-2 text-xs text-gray-500">
          When enabled, storefront gallery changes to selected variant images. When disabled, product default images stay visible.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900">Profile-Based Variant Builder</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color Profile</label>
            <select
              value={selectedColorProfileId}
              onChange={(e) => setSelectedColorProfileId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select Color Profile</option>
              {colorProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Size Profile</label>
            <select
              value={selectedSizeProfileId}
              onChange={(e) => setSelectedSizeProfileId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select Size Profile</option>
              {sizeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Available Colors</p>
            <div className="flex flex-wrap gap-2">
              {availableColors.length === 0 && (
                <p className="text-xs text-gray-400">No active colors in selected profile</p>
              )}
              {availableColors.map((color) => {
                const checked = selectedColors.includes(color.name);
                return (
                  <button
                    type="button"
                    key={color.id}
                    onClick={() => toggleColor(color.name)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${checked ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}
                  >
                    <span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: color.hex_code }} />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Available Sizes</p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.length === 0 && (
                <p className="text-xs text-gray-400">No sizes in selected profile</p>
              )}
              {availableSizes.map((size) => {
                const checked = selectedSizes.includes(size);
                return (
                  <button
                    type="button"
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${checked ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Stock</label>
            <input
              type="number"
              min="0"
              value={defaultStock}
              onChange={(e) => setDefaultStock(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Price Adjustment</label>
            <input
              type="number"
              step="0.01"
              value={defaultPriceAdjustment}
              onChange={(e) => setDefaultPriceAdjustment(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={defaultEnabled}
                onChange={(e) => setDefaultEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Default Active
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowGenerator(true);
              generateCombinations();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Generate Variants
          </button>
          <span className="text-xs text-gray-500">Creates all Color x Size combinations from selected values.</span>
        </div>

        {showGenerator && generatedColorGroups.length > 0 && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Preview Generated Color Groups</h4>

            {generatedColorGroups.map((colorGroup) => (
              <div
                key={colorGroup.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-6 w-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: colorGroup.hex_code }}
                    />
                    <span className="text-sm font-medium text-gray-900">{colorGroup.color_name}</span>
                    <span className="text-xs text-gray-500">({colorGroup.sizes.length} sizes)</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Size</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Stock</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Price Adj</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {colorGroup.sizes.map((size, idx) => (
                        <tr key={size.id}>
                          <td className="px-3 py-2 text-gray-700">{size.size}</td>
                          <td className="px-3 py-2">
                            <input
                              value={size.sku}
                              onChange={(e) =>
                                updateGeneratedSize(colorGroup.id, idx, "sku", e.target.value)
                              }
                              className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={size.stock_quantity}
                              onChange={(e) =>
                                updateGeneratedSize(colorGroup.id, idx, "stock_quantity", e.target.value)
                              }
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={size.price_adjustment}
                              onChange={(e) =>
                                updateGeneratedSize(colorGroup.id, idx, "price_adjustment", e.target.value)
                              }
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={size.enabled}
                              onChange={(e) =>
                                updateGeneratedSize(colorGroup.id, idx, "enabled", e.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="flex justify-between border-t border-gray-200 pt-3">
              <button
                type="button"
                onClick={() => {
                  setGeneratedColorGroups([]);
                  setShowGenerator(false);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={createGeneratedVariants}
                disabled={creatingBulk}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {creatingBulk ? "Creating..." : `Create ${generatedColorGroups.reduce((sum, g) => sum + g.sizes.length, 0)} Variants`}
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Manual Variant Creation</h4>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select
              value={manualColor}
              onChange={(e) => setManualColor(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Color</option>
              {availableColors.map((color) => (
                <option key={color.id} value={color.name}>{color.name}</option>
              ))}
            </select>

            <select
              value={manualSize}
              onChange={(e) => setManualSize(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Size</option>
              {availableSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <input
              type="text"
              value={manualSku}
              onChange={(e) => setManualSku(e.target.value)}
              placeholder="SKU"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <input
              type="number"
              min="0"
              value={manualStock}
              onChange={(e) => setManualStock(Number(e.target.value) || 0)}
              placeholder="Stock"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={manualPriceAdjustment}
              onChange={(e) => setManualPriceAdjustment(normalizePriceAdjustment(e.target.value))}
              placeholder="Price Adj"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2">
              <label className="text-xs text-gray-700">Active</label>
              <input
                type="checkbox"
                checked={manualEnabled}
                onChange={(e) => setManualEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={createManualVariant}
            disabled={creatingManual}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {creatingManual ? "Creating..." : "Add Variant"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Color Groups & Size Variants ({colorGroups.length} colors, {colorGroups.reduce((sum, g) => sum + g.size_variants.length, 0)} variants)
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Base price: Rs. {basePrice.toLocaleString("en-IN")}. Images are shared across all sizes within a color group.
          </p>
          <p className="mt-1 text-xs text-gray-500">Price adjustment must be 0 or higher.</p>
        </div>

        {colorGroups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">No color groups created yet.</div>
        ) : (
          <div className="space-y-4 p-4">
            {colorGroups.map((colorGroup, groupIndex) => {
              const isExpanded = expandedColorGroups.has(colorGroup.color_name);

              return (
                <div key={groupIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Color Group Header */}
                  <div
                    className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between"
                    onClick={() => {
                      const newExpanded = new Set(expandedColorGroups);
                      if (newExpanded.has(colorGroup.color_name)) {
                        newExpanded.delete(colorGroup.color_name);
                      } else {
                        newExpanded.add(colorGroup.color_name);
                      }
                      setExpandedColorGroups(newExpanded);
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-600" />
                      )}
                      <span
                        className="h-6 w-6 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: colorGroup.hex_code }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{colorGroup.color_name}</p>
                        <p className="text-xs text-gray-500">{colorGroup.size_variants.length} size variants</p>
                      </div>
                    </div>
                    <label
                      className="inline-flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={colorGroup.enabled}
                        readOnly
                        aria-label={`${colorGroup.color_name} active status`}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs text-gray-600">Active</span>
                    </label>
                  </div>

                  {/* Color Group Content (Images + Size Variants) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white">
                      {/* Image Gallery Section */}
                      <div className="px-4 py-4 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-700 mb-3">Color Group Images (Shared by all sizes)</p>
                        <VariantImageSelector
                          variantId={`color-group-${groupIndex}`}
                          variantLabel={`${colorGroup.color_name} Images`}
                          currentImages={colorGroup.images}
                          availableImages={productImages}
                          onUpdate={(images) => updateColorGroupImages(groupIndex, images)}
                        />
                      </div>

                      {/* Size Variants Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 border-t border-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Size</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">SKU</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Stock Qty</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Price Adjust</th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Active</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {colorGroup.size_variants.map((sizeVariant) => {
                              const finalPrice = basePrice + sizeVariant.price_adjustment;

                              return (
                                <tr key={sizeVariant.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700 font-medium">{sizeVariant.size}</td>
                                  <td className="px-4 py-2">
                                    <input
                                      value={sizeVariant.sku}
                                      onChange={(e) =>
                                        updateVariantField(sizeVariant.id, "sku", e.target.value)
                                      }
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={sizeVariant.stock_quantity}
                                      onChange={(e) =>
                                        updateVariantField(sizeVariant.id, "stock_quantity", e.target.value)
                                      }
                                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="space-y-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={sizeVariant.price_adjustment}
                                        onChange={(e) =>
                                          updateVariantField(sizeVariant.id, "price_adjustment", e.target.value)
                                        }
                                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                                      />
                                      <div className="text-xs text-gray-500">
                                        Final: Rs. {finalPrice.toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={sizeVariant.enabled}
                                      onChange={(e) =>
                                        updateVariantField(sizeVariant.id, "enabled", e.target.checked)
                                      }
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => saveVariant(sizeVariant.id)}
                                        disabled={sizeVariant.isSaving}
                                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-60"
                                      >
                                        <Save className="h-3.5 w-3.5" />
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteVariant(sizeVariant.id)}
                                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
