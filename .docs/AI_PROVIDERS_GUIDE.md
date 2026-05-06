# AI Provider Configuration Guide

Complete documentation for all supported AI providers with setup instructions and API specifications.

## 🌟 Supported Providers

1. **OpenRouter** (Recommended) - Access to 100+ models
2. **OpenAI** - GPT-3.5, GPT-4, GPT-4o
3. **Anthropic** - Claude 3 (Haiku, Sonnet, Opus)
4. **Google Gemini** - Gemini 1.5 (Flash, Pro)
5. **Cohere** - Command-R models

---

## OpenRouter (Recommended)

**Why Choose OpenRouter:**

- Access to 100+ models from multiple providers
- Single API key for all models
- Free tier available
- Pay-as-you-go pricing
- No monthly commitments

### Setup

1. **Get API Key**: https://openrouter.ai/keys
2. **Free Models Available**:
   - `meta-llama/llama-3.1-8b-instruct:free`
   - `google/gemini-flash-1.5:free`
   - `mistralai/mistral-7b-instruct:free`

### Configuration

```
Base URL: https://openrouter.ai/api/v1
Authentication: Bearer token in Authorization header
Required Headers:
  - Authorization: Bearer YOUR_API_KEY
  - HTTP-Referer: your-site-url (optional, for rankings)
  - X-Title: your-app-name (optional, for rankings)
Default Model: meta-llama/llama-3.1-8b-instruct:free
```

### API Key Format

```
sk-or-v1-1234567890abcdef...
```

### Popular Models

- **Free**: `meta-llama/llama-3.1-8b-instruct:free`
- **Best Value**: `anthropic/claude-3-haiku`
- **Most Capable**: `anthropic/claude-3.5-sonnet`
- **GPT-4**: `openai/gpt-4-turbo`

---

## OpenAI

### Setup

1. **Get API Key**: https://platform.openai.com/api-keys
2. **Set up billing**: https://platform.openai.com/account/billing

### Configuration

```
Base URL: https://api.openai.com/v1
Authentication: Bearer token in Authorization header
Required Headers:
  - Authorization: Bearer YOUR_API_KEY
  - Content-Type: application/json
Default Model: gpt-3.5-turbo
```

### API Key Format

```
sk-proj-1234567890abcdef...
```

### Available Models

- **gpt-3.5-turbo**: Fast, affordable (~$0.50/1M tokens)
- **gpt-4-turbo**: Best balance (~$10/1M tokens)
- **gpt-4o**: Multimodal (~$5/1M tokens input, $15/1M output)

### Pricing

- GPT-3.5 Turbo: $0.50 per 1M input tokens
- GPT-4 Turbo: $10 per 1M input tokens
- GPT-4o: $5 per 1M input, $15 per 1M output

---

## Anthropic Claude

### Setup

1. **Get API Key**: https://console.anthropic.com/settings/keys
2. **Set up billing**: https://console.anthropic.com/settings/billing

### Configuration

```
Base URL: https://api.anthropic.com/v1
Authentication: x-api-key header (NOT Bearer)
Required Headers:
  - x-api-key: YOUR_API_KEY
  - anthropic-version: 2023-06-01
  - Content-Type: application/json
Default Model: claude-3-haiku-20240307
```

### API Key Format

```
sk-ant-api03-1234567890abcdef...
```

### Available Models

- **claude-3-haiku-20240307**: Fast, affordable (~$0.25/1M tokens)
- **claude-3-5-sonnet-20241022**: Best balance (~$3/1M input)
- **claude-3-opus-20240229**: Most capable (~$15/1M input)

### Special Notes

- Uses `/messages` endpoint (different from OpenAI)
- Response format: `data.content[0].text` instead of `data.choices[0].message.content`
- Requires `anthropic-version` header

---

## Google Gemini

### Setup

1. **Get API Key**: https://aistudio.google.com/app/apikey
2. **Free tier**: 60 requests/minute

### Configuration

```
Base URL: https://generativelanguage.googleapis.com/v1beta
Authentication: API key in URL parameter (NOT header)
Endpoint Format: /models/{model}:generateContent?key=YOUR_API_KEY
Default Model: gemini-1.5-flash
```

### API Key Format

```
AIzaSy1234567890abcdef...
```

### Available Models

- **gemini-1.5-flash**: Fast, free tier available
- **gemini-1.5-pro**: More capable, larger context
- **gemini-1.0-pro**: Previous generation

### Special Notes

- API key goes in URL, not Authorization header
- Uses `/generateContent` endpoint
- Response format: `data.candidates[0].content.parts[0].text`
- Free tier: 15 RPM, 1.5M requests/day

###Pricing (Paid Tier)

- Gemini 1.5 Flash: Free up to 15 RPM
- Gemini 1.5 Pro: $3.50 per 1M input tokens

---

## Cohere

### Setup

1. **Get API Key**: https://dashboard.cohere.com/api-keys
2. **Trial Key**: 1,000 calls/month free

### Configuration

```
Base URL: https://api.cohere.ai/v1
Authentication: Bearer token in Authorization header
Required Headers:
  - Authorization: Bearer YOUR_API_KEY
  - Content-Type: application/json
Default Model: command-r
```

### API Key Format

```
1234567890abcdef...
```

### Available Models

- **command-r**: Retrieval-augmented generation
- **command**: General purpose
- **command-light**: Faster, lightweight

### Special Notes

- Uses `/generate` endpoint (not `/chat/completions`)
- Request format: `prompt` field instead of `messages`
- Response format: `data.generations[0].text`

---

## Quick Comparison

| Provider      | Free Tier             | Best For                  | Avg Cost    |
| ------------- | --------------------- | ------------------------- | ----------- |
| OpenRouter    | ✅ Yes (free models)  | Access to all models      | Varies      |
| OpenAI        | ❌ No                 | General purpose, reliable | $0.50-15/1M |
| Anthropic     | ❌ No                 | Long context, quality     | $0.25-15/1M |
| Google Gemini | ✅ Yes (15 RPM)       | Fast, free tier           | Free/Low    |
| Cohere        | ✅ Limited (1K/month) | Specialized tasks         | $1-15/1M    |

---

## Configuration in App

### Adding a Provider

1. Navigate to **Admin → Settings → AI Settings**
2. Click **"+ Add New Key"**
3. Select provider from dropdown
4. Paste your API key
5. (Optional) Add a label like "Production" or "Test"
6. Click **"Save API Key"**

### Activating a Provider

1. Find your saved key in the list
2. Click **"Activate"** button
3. Green "Active Provider" banner appears
4. All AI features now use this provider

### Switching Providers

- Click "Activate" on any other saved key
- Previous provider becomes inactive
- Keys are NOT deleted when switching
- Switch back anytime

### Testing Connection

- Click **"Test"** button next to any key
- Verifies API key is valid
- Checks connectivity to provider

---

## API Implementation Details

### OpenRouter

```typescript
// Headers
{
  'Authorization': 'Bearer sk-or-v1-...',
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://yoursite.com',
  'X-Title': 'Your App Name'
}

// Request
POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "meta-llama/llama-3.1-8b-instruct:free",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

### OpenAI

```typescript
// Headers
{
  'Authorization': 'Bearer sk-proj-...',
  'Content-Type': 'application/json'
}

// Request
POST https://api.openai.com/v1/chat/completions
{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Hello"}]
}
```

### Anthropic

```typescript
// Headers
{
  'x-api-key': 'sk-ant-api03-...',
  'anthropic-version': '2023-06-01',
  'Content-Type': 'application/json'
}

// Request
POST https://api.anthropic.com/v1/messages
{
  "model": "claude-3-haiku-20240307",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 1000
}
```

### Google Gemini

```typescript
// No Authorization header - key in URL
GET https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSy...

// Request
{
  "contents": [{"parts": [{"text": "Hello"}]}],
  "generationConfig": {"maxOutputTokens": 1000}
}
```

### Cohere

```typescript
// Headers
{
  'Authorization': 'Bearer 1234567890...',
  'Content-Type': 'application/json'
}

// Request
POST https://api.cohere.ai/v1/generate
{
  "model": "command-r",
  "prompt": "Hello",
  "max_tokens": 1000
}
```

---

## Recommendations

### For Development/Testing

**Use**: OpenRouter (free models) or Google Gemini (free tier)
**Why**: No cost, good for testing

### For Production (Low Volume)

**Use**: Google Gemini or OpenRouter
**Why**: Free tier or pay-per-use

### For Production (High Quality)

**Use**: OpenAI GPT-4 or Anthropic Claude 3.5 Sonnet
**Why**: Best quality, worth the cost

### For Production (Best Value)

**Use**: OpenAI GPT-3.5 or Anthropic Haiku
**Why**: Good quality, affordable

---

## Troubleshooting

### "No active AI provider configured"

- Go to AI Settings
- Make sure you saved an API key
- Click "Activate" on your saved key

### "API request failed: 401"

- Your API key is invalid
- Check for typos
- Generate a new key from provider

### "API request failed: 429"

- Rate limit exceeded
- Wait a few minutes
- Upgrade to paid tier

### "API request failed: 402"

- Billing issue (OpenAI/Anthropic)
- Add payment method
- Check account balance

---

Last Updated: 2025-12-20
