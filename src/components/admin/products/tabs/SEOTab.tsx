"use client";

import { useFormContext } from "react-hook-form";
import { useState } from "react";
import { Search, X } from "lucide-react";

export default function SEOTab() {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const [keywordInput, setKeywordInput] = useState("");

  const metaTitle = watch("meta_title") || "";
  const metaDescription = watch("meta_description") || "";
  const metaKeywords = watch("meta_keywords") || [];
  const productName = watch("name") || "";

  // Add keyword
  const addKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !metaKeywords.includes(trimmed)) {
      setValue("meta_keywords", [...metaKeywords, trimmed], { shouldDirty: true });
      setKeywordInput("");
    }
  };

  // Remove keyword
  const removeKeyword = (keywordToRemove: string) => {
    setValue(
      "meta_keywords",
      metaKeywords.filter((keyword: string) => keyword !== keywordToRemove),
      { shouldDirty: true }
    );
  };

  // Handle keyword input
  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // Character counts
  const titleLength = metaTitle?.length || 0;
  const descriptionLength = metaDescription?.length || 0;

  // SEO recommendations
  const titleStatus =
    titleLength === 0
      ? "empty"
      : titleLength < 30
      ? "short"
      : titleLength <= 60
      ? "good"
      : "long";

  const descriptionStatus =
    descriptionLength === 0
      ? "empty"
      : descriptionLength < 120
      ? "short"
      : descriptionLength <= 160
      ? "good"
      : "long";

  return (
    <div className="max-w-4xl space-y-8">
      {/* Search Preview */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Preview
        </h2>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">www.yourstore.com/products/{watch("slug") || "product-slug"}</div>
          <div className="text-xl text-blue-800 mb-2 font-medium">
            {metaTitle || productName || "Product Title"}
          </div>
          <div className="text-sm text-gray-600">
            {metaDescription || "No meta description provided. This is how your product will appear in search results."}
          </div>
        </div>
      </section>

      {/* Meta Title */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meta Title</h2>
        
        <div>
          <input
            type="text"
            {...register("meta_title")}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.meta_title ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Enter SEO title"
            maxLength={255}
          />
          
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`
                ${titleStatus === "good" ? "text-green-600" : ""}
                ${titleStatus === "short" || titleStatus === "long" ? "text-yellow-600" : ""}
                ${titleStatus === "empty" ? "text-gray-500" : ""}
              `}>
                {titleLength} / 60 characters
              </span>
              {titleStatus === "good" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Optimal</span>
              )}
              {titleStatus === "short" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Too short</span>
              )}
              {titleStatus === "long" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Too long</span>
              )}
            </div>
          </div>
          
          {errors.meta_title && (
            <p className="mt-1 text-sm text-red-600">{errors.meta_title.message as string}</p>
          )}
          
          <p className="mt-2 text-xs text-gray-500">
            Recommended: 30-60 characters. If empty, product name will be used.
          </p>
        </div>
      </section>

      {/* Meta Description */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meta Description</h2>
        
        <div>
          <textarea
            {...register("meta_description")}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.meta_description ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Enter a compelling description for search results"
            maxLength={500}
          />
          
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`
                ${descriptionStatus === "good" ? "text-green-600" : ""}
                ${descriptionStatus === "short" || descriptionStatus === "long" ? "text-yellow-600" : ""}
                ${descriptionStatus === "empty" ? "text-gray-500" : ""}
              `}>
                {descriptionLength} / 160 characters
              </span>
              {descriptionStatus === "good" && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Optimal</span>
              )}
              {descriptionStatus === "short" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Too short</span>
              )}
              {descriptionStatus === "long" && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">May be truncated</span>
              )}
            </div>
          </div>
          
          {errors.meta_description && (
            <p className="mt-1 text-sm text-red-600">{errors.meta_description.message as string}</p>
          )}
          
          <p className="mt-2 text-xs text-gray-500">
            Recommended: 120-160 characters. Summarize what makes this product unique.
          </p>
        </div>
      </section>

      {/* Meta Keywords */}
      <section className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Meta Keywords</h2>
        
        <div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add keyword"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>

          {metaKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {metaKeywords.map((keyword: string) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No keywords added yet</p>
          )}

          <p className="mt-3 text-xs text-gray-500">
            Add relevant keywords that customers might search for. Press Enter or click Add to add a keyword.
          </p>
        </div>
      </section>

      {/* SEO Tips */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">SEO Best Practices</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Use your primary keyword in the meta title and description</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Make your meta description compelling to encourage clicks</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Include unique selling points or key features in the description</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Avoid keyword stuffing - use natural, readable language</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Keep meta titles unique across all products</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
