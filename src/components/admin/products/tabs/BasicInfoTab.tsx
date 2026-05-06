"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useEffect, useState } from "react";
import RichTextEditor from "../RichTextEditor";

interface Brand {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface SizeGuide {
  id: string;
  name: string;
  category: string;
}

interface Collection {
  id: string;
  name: string;
  is_active: boolean;
}

interface WashInstruction {
  id: string;
  name: string;
}

export default function BasicInfoTab() {
  const { register, control, formState: { errors }, watch, setValue } = useFormContext();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingSizeGuides, setLoadingSizeGuides] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [sizeGuidesError, setSizeGuidesError] = useState<string | null>(null);
  const [washInstructionsError, setWashInstructionsError] = useState<string | null>(null);
  const [washInstructions, setWashInstructions] = useState<WashInstruction[]>([]);
  const [loadingWashInstructions, setLoadingWashInstructions] = useState(true);
  
  const productName = watch("name");
  const currentTags = watch("tags") || [];
  const discountEngineEnabled = watch("discount_engine_enabled");
  const discountType = watch("discount_type");
  const selectedBrandId = watch("brand_id");
  const selectedCategoryId = watch("category_id");
  const selectedSizeChartId = watch("size_chart_id");
  const selectedWashInstructionId = watch("wash_instruction_id");
  const selectedCollectionIds: string[] = watch("collection_ids") || [];
  const slug = watch("slug");

  // Auto-generate SKU function
  const generateSKU = () => {
    const selectedBrand = brands.find(b => b.id === selectedBrandId);
    const brandCode = selectedBrand?.code || "PROD";
    const slugPart = slug?.toUpperCase().replace(/-/g, "").slice(0, 8) || "ITEM";
    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    const generatedSKU = `${brandCode}-${slugPart}-${randomPart}`;
    setValue("sku", generatedSKU, { shouldDirty: true });
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (productName) {
      const slug = productName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setValue("slug", slug, { shouldDirty: true });
    }
  }, [productName, setValue]);

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch("/api/admin/brands");
        if (response.ok) {
          const data = await response.json();
          setBrands(data.brands || []);
          setBrandsError(null);
        } else {
          setBrandsError("Failed to load brands");
        }
      } catch (error) {
        console.error("Failed to fetch brands:", error);
        setBrandsError("Failed to load brands");
      } finally {
        setLoadingBrands(false);
      }
    };
    fetchBrands();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/admin/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
          setCategoriesError(null);
        } else {
          setCategoriesError("Failed to load categories");
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategoriesError("Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Fetch size guides
  useEffect(() => {
    const fetchSizeGuides = async () => {
      try {
        const response = await fetch("/api/admin/size-guides");
        if (response.ok) {
          const data = await response.json();
          setSizeGuides(data.sizeGuides || []);
          setSizeGuidesError(null);
        } else {
          setSizeGuidesError("Failed to load size charts");
        }
      } catch (error) {
        console.error("Failed to fetch size guides:", error);
        setSizeGuidesError("Failed to load size charts");
      } finally {
        setLoadingSizeGuides(false);
      }
    };
    fetchSizeGuides();
  }, []);

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch("/api/admin/collections?active=true");
        if (response.ok) {
          const data = await response.json();
          setCollections(data.collections || []);
        }
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      } finally {
        setLoadingCollections(false);
      }
    };
    fetchCollections();
  }, []);

  // Fetch wash instructions
  useEffect(() => {
    const fetchWashInstructions = async () => {
      try {
        const response = await fetch('/api/admin/wash-instructions', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setWashInstructions(data.washInstructions || []);
          setWashInstructionsError(null);
        } else {
          setWashInstructionsError('Failed to load wash instructions');
        }
      } catch (error) {
        console.error('Failed to fetch wash instructions:', error);
        setWashInstructionsError('Failed to load wash instructions');
      } finally {
        setLoadingWashInstructions(false);
      }
    };

    fetchWashInstructions();
  }, []);

  // Legacy fallback mapping: if persisted value isn't an option ID, try matching by name.
  useEffect(() => {
    if (!selectedBrandId || brands.length === 0) return;
    const alreadyValid = brands.some((b) => b.id === selectedBrandId);
    if (alreadyValid) return;

    const match = brands.find((b) => b.name.toLowerCase() === String(selectedBrandId).toLowerCase());
    if (match) {
      setValue('brand_id', match.id, { shouldDirty: false });
    }
  }, [selectedBrandId, brands, setValue]);

  useEffect(() => {
    if (!selectedCategoryId || categories.length === 0) return;
    const alreadyValid = categories.some((c) => c.id === selectedCategoryId);
    if (alreadyValid) return;

    const match = categories.find((c) => c.name.toLowerCase() === String(selectedCategoryId).toLowerCase());
    if (match) {
      setValue('category_id', match.id, { shouldDirty: false });
    }
  }, [selectedCategoryId, categories, setValue]);

  useEffect(() => {
    if (!selectedSizeChartId || sizeGuides.length === 0) return;
    const alreadyValid = sizeGuides.some((g) => g.id === selectedSizeChartId);
    if (alreadyValid) return;

    const match = sizeGuides.find((g) => g.name.toLowerCase() === String(selectedSizeChartId).toLowerCase());
    if (match) {
      setValue('size_chart_id', match.id, { shouldDirty: false });
    }
  }, [selectedSizeChartId, sizeGuides, setValue]);

  useEffect(() => {
    if (!selectedWashInstructionId || washInstructions.length === 0) return;
    const alreadyValid = washInstructions.some((w) => w.id === selectedWashInstructionId);
    if (alreadyValid) return;

    const match = washInstructions.find((w) => w.name.toLowerCase() === String(selectedWashInstructionId).toLowerCase());
    if (match) {
      setValue('wash_instruction_id', match.id, { shouldDirty: false });
    }
  }, [selectedWashInstructionId, washInstructions, setValue]);

  // Tag management
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !currentTags.includes(trimmed)) {
      setValue("tags", [...currentTags, trimmed], { shouldDirty: true });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      "tags",
      currentTags.filter((tag: string) => tag !== tagToRemove),
      { shouldDirty: true }
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const toggleCollection = (collectionId: string) => {
    const next = selectedCollectionIds.includes(collectionId)
      ? selectedCollectionIds.filter(id => id !== collectionId)
      : [...selectedCollectionIds, collectionId];

    setValue("collection_ids", next, { shouldDirty: true });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Basic Information */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          {/* Product Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Enter product name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message as string}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug <span className="text-red-500">*</span>
            </label>
            <input
              id="slug"
              type="text"
              {...register("slug")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.slug ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="product-url-slug"
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-600">{errors.slug.message as string}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Auto-generated from product name</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  content={field.value || ""}
                  onChange={field.onChange}
                  placeholder="Enter product description"
                />
              )}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message as string}</p>
            )}
          </div>

          {/* Short Description */}
          <div>
            <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
              Short Description
            </label>
            <textarea
              id="short_description"
              rows={3}
              {...register("short_description")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.short_description ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Brief summary shown in listings"
            />
            {errors.short_description && (
              <p className="mt-1 text-sm text-red-600">{errors.short_description.message as string}</p>
            )}
          </div>

          {/* Base Price */}
          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-1">
              Base Price <span className="text-red-500">*</span> <span className="text-xs text-gray-500">(hidden from customers)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">₹</span>
              <input
                id="base_price"
                type="number"
                step="0.01"
                {...register("base_price", { valueAsNumber: true })}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.base_price ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.base_price && (
              <p className="mt-1 text-sm text-red-600">{errors.base_price.message as string}</p>
            )}
          </div>

          {/* Pricing Engine */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Pricing Engine</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Price <span className="text-xs text-gray-500">(hidden from customers)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    {...register("cost_price", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.cost_price ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.cost_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.cost_price.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="mrp" className="block text-sm font-medium text-gray-700 mb-1">
                  MRP
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    id="mrp"
                    type="number"
                    step="0.01"
                    {...register("mrp", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.mrp ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.mrp && (
                  <p className="mt-1 text-sm text-red-600">{errors.mrp.message as string}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="discount_engine_enabled"
                type="checkbox"
                {...register("discount_engine_enabled")}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="discount_engine_enabled" className="ml-2 text-sm text-gray-700">
                Enable discount engine
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="discount_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  id="discount_type"
                  {...register("discount_type")}
                  disabled={!discountEngineEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label htmlFor="discount_value" className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value {discountType === "percentage" ? "(%)" : "(₹)"}
                </label>
                <input
                  id="discount_value"
                  type="number"
                  step="0.01"
                  {...register("discount_value", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                  disabled={!discountEngineEnabled}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 ${
                    errors.discount_value ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={discountType === "percentage" ? "10" : "100"}
                />
                {errors.discount_value && (
                  <p className="mt-1 text-sm text-red-600">{errors.discount_value.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="selling_price" className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    {...register("selling_price", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.selling_price ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.selling_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.selling_price.message as string}</p>
                )}
              </div>
            </div>

            {/* Pricing Logic Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-900 font-medium mb-1">💡 Pricing Logic:</p>
              <ul className="text-blue-800 space-y-1 ml-4 list-disc">
                <li><strong>Internal:</strong> Discount is calculated on Base Price</li>
                <li><strong>Customer View:</strong> Discount shown from MRP (Base Price & Cost Price hidden)</li>
                <li><strong>No Discount:</strong> Selling Price = Base Price, but customer still sees discount from MRP</li>
              </ul>
            </div>
          </div>

          {/* Shipping Charge */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Shipping Charge</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shipping_charge" className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Charge
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">₹</span>
                  <input
                    id="shipping_charge"
                    type="number"
                    step="0.01"
                    {...register("shipping_charge", {
                      setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
                    })}
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.shipping_charge ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.shipping_charge && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_charge.message as string}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="shipping_included_in_price"
                  type="checkbox"
                  {...register("shipping_included_in_price")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="shipping_included_in_price" className="ml-2 text-sm text-gray-700">
                  Include shipping charge in selling price
                </label>
              </div>
            </div>
          </div>

          {/* Product Attributes */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Product Attributes</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fabric" className="block text-sm font-medium text-gray-700 mb-1">
                  Fabric
                </label>
                <input
                  id="fabric"
                  type="text"
                  {...register("fabric")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fabric ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., Cotton, Polyester, Cotton Blend"
                />
                {errors.fabric && (
                  <p className="mt-1 text-sm text-red-600">{errors.fabric.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="gsm" className="block text-sm font-medium text-gray-700 mb-1">
                  GSM (Grams per Square Meter)
                </label>
                <input
                  id="gsm"
                  type="number"
                  step="1"
                  {...register("gsm", {
                    setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.gsm ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., 180, 200, 220"
                />
                {errors.gsm && (
                  <p className="mt-1 text-sm text-red-600">{errors.gsm.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="fit_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Fit Type
                </label>
                <input
                  id="fit_type"
                  type="text"
                  {...register("fit_type")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fit_type ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., Slim Fit, Regular Fit, Oversized"
                />
                {errors.fit_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.fit_type.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="print_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Print/Decoration Type
                </label>
                <input
                  id="print_type"
                  type="text"
                  {...register("print_type")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.print_type ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="e.g., Screen Print, DTG, Embroidery"
                />
                {errors.print_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.print_type.message as string}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organization */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="brand_id" className="block text-sm font-medium text-gray-700 mb-1">
              Brand
            </label>
            <Controller
              name="brand_id"
              control={control}
              render={({ field }) => (
                <select
                  id="brand_id"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                  disabled={loadingBrands}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {brandsError && <p className="mt-1 text-xs text-red-600">{brandsError}</p>}
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <select
                  id="category_id"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                  disabled={loadingCategories}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {categoriesError && <p className="mt-1 text-xs text-red-600">{categoriesError}</p>}
          </div>

          <div>
            <label htmlFor="size_chart_id" className="block text-sm font-medium text-gray-700 mb-1">
              Size Chart
            </label>
            <Controller
              name="size_chart_id"
              control={control}
              render={({ field }) => (
                <select
                  id="size_chart_id"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                  disabled={loadingSizeGuides}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No size chart</option>
                  {sizeGuides.map((guide) => (
                    <option key={guide.id} value={guide.id}>
                      {guide.name} ({guide.category})
                    </option>
                  ))}
                </select>
              )}
            />
            <p className="mt-1 text-xs text-gray-500">Assign a size chart to help customers find their size</p>
            {sizeGuidesError && <p className="mt-1 text-xs text-red-600">{sizeGuidesError}</p>}
          </div>

          {/* Wash Instruction Assignment */}
          <div>
            <label htmlFor="wash_instruction_id" className="block text-sm font-medium text-gray-700 mb-1">
              Wash Instruction
            </label>
            <Controller
              name="wash_instruction_id"
              control={control}
              render={({ field }) => (
                <select
                  id="wash_instruction_id"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                  disabled={loadingWashInstructions}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No wash instruction</option>
                  {washInstructions.map((wi) => (
                    <option key={wi.id} value={wi.id}>{wi.name}</option>
                  ))}
                </select>
              )}
            />
            <p className="mt-1 text-xs text-gray-500">Assign a wash instruction profile for care guidance</p>
            {washInstructionsError && <p className="mt-1 text-xs text-red-600">{washInstructionsError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collections</label>
            <div className="max-h-36 overflow-auto rounded-lg border border-gray-300 p-2 space-y-1">
              {loadingCollections && <p className="text-xs text-gray-500 px-1 py-2">Loading collections...</p>}
              {!loadingCollections && collections.length === 0 && (
                <p className="text-xs text-gray-500 px-1 py-2">No active collections found.</p>
              )}
              {!loadingCollections && collections.map((collection) => (
                <label
                  key={collection.id}
                  className="flex items-center gap-2 text-sm text-gray-700 px-1 py-1.5 hover:bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollectionIds.includes(collection.id)}
                    onChange={() => toggleCollection(collection.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span>{collection.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Select one or more collections for merchandising.</p>
          </div>
        </div>

        {/* SKU */}
        <div className="mt-4">
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
            SKU (Stock Keeping Unit)
          </label>
          <div className="flex gap-2">
            <input
              id="sku"
              type="text"
              {...register("sku")}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Product SKU"
            />
            <button
              type="button"
              onClick={generateSKU}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Generate SKU
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Format: BRAND-PRODUCTNAME-RANDOM (e.g., CC-JACKET-A2X)
          </p>
        </div>

        {/* Status */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="draft"
                {...register("status")}
                className="mr-2"
              />
              <span className="text-sm">Draft</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="active"
                {...register("status")}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="archived"
                {...register("status")}
                className="mr-2"
              />
              <span className="text-sm">Archived</span>
            </label>
          </div>
        </div>
      </section>

      {/* Search & Discovery */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Discovery</h2>
        
        <div className="space-y-4">
          {/* Searchable Toggle */}
          <div className="flex items-center">
            <input
              id="is_searchable"
              type="checkbox"
              {...register("is_searchable")}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_searchable" className="ml-2 text-sm text-gray-700">
              Make this product searchable
            </label>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add a tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Logistics */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Logistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HS Code */}
          <div>
            <label htmlFor="hs_code" className="block text-sm font-medium text-gray-700 mb-1">
              HS Code
            </label>
            <input
              id="hs_code"
              type="text"
              {...register("hs_code")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. 6109.10.00"
            />
            <p className="mt-1 text-xs text-gray-500">Harmonized System code for customs</p>
          </div>

          {/* Country of Origin */}
          <div>
            <label htmlFor="country_of_origin" className="block text-sm font-medium text-gray-700 mb-1">
              Country of Origin
            </label>
            <input
              id="country_of_origin"
              type="text"
              maxLength={2}
              {...register("country_of_origin")}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.country_of_origin ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="IN"
            />
            {errors.country_of_origin && (
              <p className="mt-1 text-sm text-red-600">{errors.country_of_origin.message as string}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">2-letter country code (ISO 3166-1 alpha-2)</p>
          </div>
        </div>
      </section>
    </div>
  );
}
