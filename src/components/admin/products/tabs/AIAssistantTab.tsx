"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Sparkles, Loader2, AlertCircle, Copy, Check } from "lucide-react";

export default function AIAssistantTab() {
  const { watch, setValue } = useFormContext();
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const productName = watch("name");
  const description = watch("description");
  const categoryId = watch("category_id");
  const rawMetaKeywords = watch("meta_keywords");
  const metaKeywords = Array.isArray(rawMetaKeywords)
    ? rawMetaKeywords.filter((keyword): keyword is string => typeof keyword === "string")
    : typeof rawMetaKeywords === "string"
      ? rawMetaKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
      : [];

  const requestAIAssistant = async () => {
    const response = await fetch("/api/admin/products/ai-assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: productName,
        category: categoryId ? String(categoryId) : "General",
        description: description || "",
        shortDescription: description || "",
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error || data?.message || "Failed to generate AI content";
      throw new Error(message);
    }

    return data?.content;
  };

  // Generate product description
  const generateDescription = async () => {
    if (!productName) {
      setError("Please enter a product name first");
      return;
    }

    setGenerating("description");
    setError(null);

    try {
      const content = await requestAIAssistant();
      const generatedDescription = content?.long_description || content?.ai_description || content?.short_description;
      if (!generatedDescription) {
        throw new Error("AI response missing description");
      }
      setValue("description", generatedDescription, { shouldDirty: true });
    } catch (err) {
      console.error("Generate description error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate description. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  // Generate SEO meta title
  const generateMetaTitle = async () => {
    if (!productName) {
      setError("Please enter a product name first");
      return;
    }

    setGenerating("meta_title");
    setError(null);

    try {
      const content = await requestAIAssistant();
      const metaTitle = content?.seo?.meta_title || content?.ai_title;
      if (!metaTitle) {
        throw new Error("AI response missing meta title");
      }
      setValue("meta_title", metaTitle, { shouldDirty: true });
    } catch (err) {
      console.error("Generate meta title error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate meta title. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  // Generate SEO meta description
  const generateMetaDescription = async () => {
    if (!productName) {
      setError("Please enter a product name first");
      return;
    }

    setGenerating("meta_description");
    setError(null);

    try {
      const content = await requestAIAssistant();
      const metaDescription = content?.seo?.meta_description || content?.short_description || content?.ai_description;
      if (!metaDescription) {
        throw new Error("AI response missing meta description");
      }
      setValue("meta_description", metaDescription, { shouldDirty: true });
    } catch (err) {
      console.error("Generate meta description error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate meta description. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  // Generate keywords
  const generateKeywords = async () => {
    if (!productName) {
      setError("Please enter a product name first");
      return;
    }

    setGenerating("keywords");
    setError(null);

    try {
      const content = await requestAIAssistant();
      const keywords = Array.isArray(content?.style_keywords)
        ? content.style_keywords
        : Array.isArray(content?.ai_tags)
          ? content.ai_tags
          : [];
      if (keywords.length === 0) {
        throw new Error("AI response missing keywords");
      }
      setValue("meta_keywords", keywords, { shouldDirty: true });
      setValue("tags", keywords.slice(0, 5), { shouldDirty: true }); // Use first 5 as tags
    } catch (err) {
      console.error("Generate keywords error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate keywords. Please try again.");
    } finally {
      setGenerating(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Content Assistant</h2>
            <p className="text-sm text-gray-600">
              Use AI to generate compelling product descriptions, SEO content, and keywords. 
              Make sure to enter a product name in the Basic Info tab first.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Product Description Generator */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Product Description</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate a compelling product description that highlights features and benefits.
        </p>
        
        {description && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 flex-1">{description}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(description, "description")}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedField === "description" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={generateDescription}
          disabled={generating !== null || !productName}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating === "description" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {description ? "Regenerate Description" : "Generate Description"}
            </>
          )}
        </button>
      </section>

      {/* SEO Meta Title Generator */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">SEO Meta Title</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate an SEO-optimized title (30-60 characters) for search engines.
        </p>
        
        {watch("meta_title") && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 flex-1">{watch("meta_title")}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(watch("meta_title"), "meta_title")}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedField === "meta_title" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={generateMetaTitle}
          disabled={generating !== null || !productName}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating === "meta_title" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {watch("meta_title") ? "Regenerate Meta Title" : "Generate Meta Title"}
            </>
          )}
        </button>
      </section>

      {/* SEO Meta Description Generator */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">SEO Meta Description</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate an SEO-optimized description (120-160 characters) for search results.
        </p>
        
        {watch("meta_description") && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 flex-1">{watch("meta_description")}</p>
              <button
                type="button"
                onClick={() => copyToClipboard(watch("meta_description"), "meta_description")}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                title="Copy to clipboard"
              >
                {copiedField === "meta_description" ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={generateMetaDescription}
          disabled={generating !== null || !productName}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating === "meta_description" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {watch("meta_description") ? "Regenerate Meta Description" : "Generate Meta Description"}
            </>
          )}
        </button>
      </section>

      {/* Keywords Generator */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Keywords & Tags</h3>
        <p className="text-sm text-gray-600 mb-4">
          Generate relevant keywords for SEO and product tags based on your product.
        </p>
        
        {metaKeywords.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {metaKeywords.map((keyword: string) => (
                <span
                  key={keyword}
                  className="inline-flex items-center px-2 py-1 bg-white text-gray-700 rounded text-xs font-medium border border-gray-200"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={generateKeywords}
          disabled={generating !== null || !productName}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating === "keywords" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {metaKeywords.length > 0 ? "Regenerate Keywords" : "Generate Keywords"}
            </>
          )}
        </button>
      </section>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> AI-generated content is a starting point. Please review and edit 
          the generated content to ensure it accurately represents your product and matches your brand voice.
        </p>
      </div>
    </div>
  );
}
