"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, AlertCircle, CheckCircle, Loader2, Eye, Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import BasicInfoTab from "./tabs/BasicInfoTab";
import MediaTab from "./tabs/MediaTab";
import VariantsTab from "./tabs/VariantsTab";
import SEOTab from "./tabs/SEOTab";
import AIAssistantTab from "./tabs/AIAssistantTab";
// import WashInstructionTab from "./tabs/WashInstructionTab";

// Product schema matching the database
const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  description: z.string().min(1, "Description is required").max(5000),
  short_description: z.string().max(500),
  base_price: z.number().min(0, "Price must be positive"),
  cost_price: z.number().min(0, "Cost price must be positive").nullable(),
  mrp: z.number().min(0, "MRP must be positive").nullable(),
  discount_engine_enabled: z.boolean(),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0, "Discount value must be positive").nullable(),
  selling_price: z.number().min(0, "Selling price must be positive").nullable(),
  fabric: z.string().max(100).nullable(),
  gsm: z.number().positive("GSM must be positive").nullable(),
  fit_type: z.string().max(100).nullable(),
  print_type: z.string().max(100).nullable(),
  shipping_charge: z.number().min(0, "Shipping charge must be positive"),
  shipping_included_in_price: z.boolean(),
  brand_id: z.string().nullable(),
  category_id: z.string().nullable(),
  size_chart_id: z.string().nullable(),
  wash_instruction_id: z.string().nullable(),
  collection_ids: z.array(z.string()),
  status: z.enum(["draft", "active", "archived"]),
  is_searchable: z.boolean(),
  tags: z.array(z.string()),
  hs_code: z.string().max(20).nullable(),
  country_of_origin: z.string().length(2).nullable(),
  meta_title: z.string().max(255).nullable(),
  meta_description: z.string().max(500).nullable(),
  meta_keywords: z.array(z.string()),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormV2Props {
  productId?: string;
  initialData?: Partial<ProductFormData>;
}

type TabId = "basic" | "media" | "variants" | "seo" | "ai";

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeOptionalNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Number.isFinite(value) ? value : null;
}

export default function ProductFormV2({ productId, initialData }: ProductFormV2Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      description: initialData?.description || "",
      short_description: initialData?.short_description || "",
      base_price: initialData?.base_price || 0,
      cost_price: initialData?.cost_price ?? null,
      mrp: initialData?.mrp ?? null,
      discount_engine_enabled: initialData?.discount_engine_enabled ?? false,
      discount_type: initialData?.discount_type || "percentage",
      discount_value: initialData?.discount_value ?? null,
      selling_price: initialData?.selling_price ?? null,
      fabric: initialData?.fabric ?? null,
      gsm: initialData?.gsm ?? null,
      fit_type: initialData?.fit_type ?? null,
      print_type: initialData?.print_type ?? null,
      shipping_charge: initialData?.shipping_charge ?? 0,
      shipping_included_in_price: initialData?.shipping_included_in_price ?? false,
      brand_id: (initialData as any)?.brand_id || (initialData as any)?.brand || null,
      category_id: initialData?.category_id || null,
      size_chart_id: (initialData as any)?.size_chart_id || null,
      wash_instruction_id: (initialData as any)?.wash_instruction_id || null,
      collection_ids: normalizeStringArray((initialData as any)?.collection_ids),
      status: (initialData?.status as "draft" | "active" | "archived") || "draft",
      is_searchable: initialData?.is_searchable ?? true,
      tags: normalizeStringArray(initialData?.tags),
      hs_code: initialData?.hs_code || null,
      country_of_origin: initialData?.country_of_origin || null,
      meta_title: initialData?.meta_title || null,
      meta_description: initialData?.meta_description || null,
      meta_keywords: normalizeStringArray((initialData as any)?.meta_keywords ?? (initialData as any)?.seo_keywords),
    },
  });

  const { formState: { isDirty, errors }, watch } = methods;

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save product
  const saveProduct = async (data: ProductFormData, isAutosave = false) => {
    try {
      if (!isAutosave) {
        setIsSaving(true);
      }
      setSaveStatus("saving");
      setErrorMessage(null);

      const url = productId 
        ? `/api/admin/products/${productId}`
        : `/api/admin/products`;

      const method = productId ? "PATCH" : "POST";

      // Fetching a fresh token before mutation keeps header and cookie in sync.
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!csrfResponse.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const csrfData = await csrfResponse.json();
      const csrfTokenForRequest = csrfData?.data?.csrfToken ?? csrfData?.csrfToken;

      if (!csrfTokenForRequest) {
        throw new Error("CSRF token missing. Please refresh and try again.");
      }

      console.log('🔍 ProductFormV2 saveProduct - data.size_chart_id:', data.size_chart_id);
      
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description.trim(),
        short_description: normalizeOptionalText(data.short_description),
        base_price: data.base_price,
        cost_price: normalizeOptionalNumber(data.cost_price),
        mrp: normalizeOptionalNumber(data.mrp),
        discount_engine_enabled: data.discount_engine_enabled,
        discount_type: data.discount_type,
        discount_value: normalizeOptionalNumber(data.discount_value),
        selling_price: normalizeOptionalNumber(data.selling_price),
        fabric: normalizeOptionalText(data.fabric),
        gsm: normalizeOptionalNumber(data.gsm),
        fit_type: normalizeOptionalText(data.fit_type),
        print_type: normalizeOptionalText(data.print_type),
        shipping_charge: data.shipping_charge,
        shipping_included_in_price: data.shipping_included_in_price,
        brand:
          typeof data.brand_id === "string" && data.brand_id.trim().length > 0
            ? data.brand_id
            : null,
        size_chart_id: data.size_chart_id || null,
        wash_instruction_id: data.wash_instruction_id || null,
        category_id:
          typeof data.category_id === "string" && data.category_id.trim().length > 0
            ? data.category_id
            : null,
        collection_ids: normalizeStringArray(data.collection_ids),
        status: data.status,
        is_searchable: data.is_searchable,
        tags: normalizeStringArray(data.tags),
        meta_title: normalizeOptionalText(data.meta_title),
        meta_description: normalizeOptionalText(data.meta_description),
        seo_keywords: normalizeStringArray(data.meta_keywords),
        hs_code: normalizeOptionalText(data.hs_code),
        country_of_origin: normalizeCountryCode(data.country_of_origin),
      };

      console.log('📤 Sending payload with size_chart_id:', payload.size_chart_id);
      console.log('📤 Full payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfTokenForRequest,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error?.message ||
          errorData?.message ||
          errorData?.error ||
          "Failed to save product";
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const savedProduct = result?.product ?? result?.data?.product;
      
      // Size chart assignment is now handled by the API
      // No client-side logic needed anymore
      
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      
      if (!isAutosave) {
        if (!productId) {
          // Redirect to edit page for new product
          if (!savedProduct?.id) {
            throw new Error("Product created but response is missing product ID");
          }
          router.push(`/admin/products/${savedProduct.id}`);
        } else {
          router.refresh();
        }
      }

      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      if (!isAutosave) {
        setIsSaving(false);
      }
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    await saveProduct(data);
  };

  // Quick actions
  const handlePublish = async () => {
    const data = methods.getValues();
    data.status = "active";
    methods.setValue("status", "active");
    await saveProduct(data);
  };

  const handleUnpublish = async () => {
    const data = methods.getValues();
    data.status = "draft";
    methods.setValue("status", "draft");
    await saveProduct(data);
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this product?")) return;
    const data = methods.getValues();
    data.status = "archived";
    methods.setValue("status", "archived");
    await saveProduct(data);
  };

  // Tab configuration with error indicators
  const tabs = [
    {
      id: "basic" as TabId,
      label: "Basic Info",
      hasError: !!(
        errors.name ||
        errors.slug ||
        errors.description ||
        errors.short_description ||
        errors.base_price ||
        errors.cost_price ||
        errors.mrp ||
        errors.discount_value ||
        errors.selling_price ||
        errors.fabric ||
        errors.gsm ||
        errors.fit_type ||
        errors.print_type ||
        errors.shipping_charge ||
        errors.shipping_included_in_price
      ),
    },
    { id: "media" as TabId, label: "Media", hasError: false },
    { id: "variants" as TabId, label: "Variants", hasError: false },
    // Wash Instruction tab removed as per updated plan
    { id: "seo" as TabId, label: "SEO", hasError: !!(errors.meta_title || errors.meta_description) },
    { id: "ai" as TabId, label: "AI Assistant", hasError: false },
  ];

  const currentStatus = watch("status");

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {productId ? "Edit Product" : "New Product"}
              </h1>
              {hasUnsavedChanges && (
                <p className="text-sm text-amber-600 mt-1">You have unsaved changes</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Save Status Indicator */}
              {saveStatus === "saving" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Error saving</span>
                </div>
              )}

              {/* Quick Actions */}
              {productId && (
                <>
                  {currentStatus === "draft" && (
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Publish
                    </button>
                  )}
                  {currentStatus === "active" && (
                    <button
                      type="button"
                      onClick={handleUnpublish}
                      disabled={isSaving}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={isSaving || currentStatus === "archived"}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                </>
              )}

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving..." : productId ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <nav className="flex px-6 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
                {tab.hasError && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {activeTab === "basic" && <BasicInfoTab />}
          {activeTab === "media" && productId && <MediaTab productId={productId} />}
          {activeTab === "media" && !productId && (
            <div className="text-center py-12 text-gray-500">
              Save the product first to upload media
            </div>
          )}
          {activeTab === "variants" && productId && <VariantsTab productId={productId} />}
          {activeTab === "variants" && !productId && (
            <div className="text-center py-12 text-gray-500">
              Save the product first to manage variants
            </div>
          )}
          {/* Wash Instruction tab removed as per updated plan */}
          {activeTab === "seo" && <SEOTab />}
          {activeTab === "ai" && <AIAssistantTab />}
        </div>
      </form>
    </FormProvider>
  );
}
