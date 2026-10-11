# Store Product Photo Upload — Design & Implementation Plan

## Current State

- **Schema**: `Product.imageUrl` exists (nullable string) in Prisma schema and database.
- **Frontend**: `StoreProductImage.tsx` component accepts `imageUrl` prop, renders `<img>` if URL is valid, falls back to category icon if missing or load fails.
- **API**: `product.service.ts` already returns `imageUrl` in list and detail responses.
- **Data**: All production `imageUrl` values are currently NULL. No verified external photo sources available.
- **Upload mechanism**: None yet. No Supabase Storage bucket, no authenticated upload endpoint, no file validation.

---

## Phase 1: Storage & Authentication Setup

### 1.1 Supabase Storage Bucket

Create a bucket named `product-photos` in Supabase:

```sql
-- Supabase SQL or dashboard:
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true);

-- Set up RLS policy for read (public):
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-photos');

-- Set up RLS policy for authenticated write (ADMIN, OPERATOR only):
CREATE POLICY "Allow authenticated write" ON storage.objects
  FOR INSERT USING (
    bucket_id = 'product-photos'
    AND auth.uid() IS NOT NULL
  );
```

### 1.2 Environment Configuration

Add to `.env.local` (or equivalent):

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # Server-side only
```

Do NOT commit secrets to version control.

### 1.3 Supabase Client Initialization

Create `src/lib/supabase-client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Phase 2: Upload API Route

### 2.1 Endpoint: POST `/api/products/[id]/upload-photo`

**Authentication & Authorization**:
- Call `requireUser(["ADMIN", "OPERATOR"])` to verify authenticated session and role.
- Prevent unauthorized photo uploads.

**Input Validation**:
```typescript
// File type & size
- Accept: image/jpeg, image/png, image/webp
- Max size: 5 MB (adjust as needed)
- Check MIME type server-side, do not trust `Content-Type` header alone.

// Product ownership
- Verify product ID exists in database.
- Confirm user has permission to modify product (e.g., ADMIN or assigned merchant).
```

**Implementation Steps**:

1. Extract file from multipart request (use `next/headers` or a multipart parser).
2. Validate file:
   - Size check.
   - MIME type check (read magic bytes if strict validation needed).
   - Optionally check image dimensions (e.g., minimum 400×300px).
3. Generate secure file path:
   ```
   products/{productId}/{timestamp}-{random-uuid}.{ext}
   Example: products/prod-123/1728658200000-a1b2c3d4.jpg
   ```
4. Upload to Supabase Storage using server-side service-role key:
   ```typescript
   const { data, error } = await supabaseAdmin.storage
     .from("product-photos")
     .upload(filePath, fileBuffer, { upsert: false });
   ```
5. On success, update `Product.imageUrl` in database:
   ```typescript
   const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-photos/${filePath}`;
   await prisma.product.update({
     where: { id: productId },
     data: { imageUrl: publicUrl },
   });
   ```
6. Return success response with the new `imageUrl`.

**Error Handling**:
- 400: Invalid file or product ID.
- 401: Not authenticated.
- 403: Insufficient role.
- 409: Storage conflict (file already exists; retryable).
- 500: Server error (storage, database, or other).

### 2.2 Example Route File

Create `src/app/api/products/[id]/upload-photo/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin"; // Server-side client
import { z } from "zod";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and role
    const user = await requireUser(["ADMIN", "OPERATOR"]);

    const { id: productId } = params;

    // Fetch product
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file
    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const ext = file.type.split("/")[1];
    const filePath = `products/${productId}/${timestamp}-${Math.random().toString(36).substring(2, 11)}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-photos")
      .upload(filePath, buffer, { upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Upload failed" },
        { status: 500 }
      );
    }

    // Generate public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/product-photos/${filePath}`;

    // Update database
    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl },
    });

    return NextResponse.json({ imageUrl, filePath }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Phase 3: Frontend Upload UI

### 3.1 Admin Product Edit Modal

Add file input and upload button to existing product edit/detail views:

```tsx
import { useState } from "react";

export function ProductPhotoUpload({ productId }: { productId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/products/${productId}/upload-photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const { imageUrl } = await response.json();
      setSuccess(true);
      // Optionally: refetch product or trigger UI update
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Photo uploaded successfully</p>}
    </div>
  );
}
```

### 3.2 Image Optimization (Optional)

Configure `next.config.mjs` to allow Supabase Storage domain:

```javascript
export default {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};
```

Then update `StoreProductImage.tsx` to use `next/image` for automatic optimization.

---

## Phase 4: Photo Source Verification & Checklist

Before adding a product photo:

1. **Source Verification**:
   - Confirm image is from official manufacturer, distributor catalog, or licensed source.
   - Check copyright and usage rights.
   - Document source URL for audit.

2. **Product Match**:
   - Verify product ID, name, brand, variant, and packaging match database record.
   - Cross-check against supplier invoice or product specification sheet.

3. **Image Quality**:
   - Minimum resolution: 400×300px.
   - Aspect ratio: variable, but should fit 4:3 or 5:4 container.
   - Format: JPEG (85% quality) or PNG.
   - File size: < 5 MB (typically < 500 KB after optimization).

4. **Upload Workflow**:
   - Upload only verified photos via authenticated API.
   - Never upload AI-generated, synthetic, or unverified placeholder images.
   - Log upload event: who, when, source, product ID.

---

## Phase 5: Audit & Compliance

### 5.1 Photo Usage Log

Optional table to track photo history:

```sql
CREATE TABLE product_photo_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  image_url VARCHAR NOT NULL,
  source_url VARCHAR,
  source_description VARCHAR,
  uploaded_by UUID NOT NULL REFERENCES "User"(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES "User"(id),
  notes TEXT
);
```

### 5.2 Verification Checklist

Create a simple admin view to list products with photos and mark them as verified:

- Product ID, name, category.
- Current photo URL (clickable).
- Verified status (true/false).
- Upload date, uploaded by, source.
- Action: mark verified, replace photo, delete photo.

---

## Integration Points

### Files to Modify

1. **`src/lib/supabase-admin.ts`** (create): Server-side Supabase client.
2. **`src/app/api/products/[id]/upload-photo/route.ts`** (create): Upload endpoint.
3. **`src/app/store/page.tsx`** (already updated): Pass `imageUrl` to component.
4. **`src/app/store/StoreProductImage.tsx`** (already updated): Render image if available.
5. **`next.config.mjs`** (optional): Configure image domains if using `next/image`.

### Database Schema

- `Product.imageUrl` (already exists): store public Supabase URL.
- `product_photo_audit` (optional): track photo history and verification.

### Environment Setup

- Supabase bucket: `product-photos`.
- RLS policies: public read, authenticated write.
- `.env.local`: Supabase URL, anon key, service-role key.

---

## Deployment Checklist

- [ ] Supabase Storage bucket created and RLS policies applied.
- [ ] Environment variables set in production.
- [ ] Upload API route tested with valid and invalid files.
- [ ] File validation (type, size, dimensions) working.
- [ ] Database update on successful upload verified.
- [ ] Frontend UI displays uploaded photos.
- [ ] Fallback icon still appears for missing photos.
- [ ] Photo audit log (if used) accessible to admins.
- [ ] Security review: role checks, file validation, error handling.
- [ ] Performance: lazy loading, image optimization, caching.

---

## Not Yet Implemented

This document describes the design. Implementation tasks:

1. Create `src/lib/supabase-admin.ts` with service-role client.
2. Build `/api/products/[id]/upload-photo` route.
3. Add UI for file selection and upload progress.
4. Write tests for upload validation and authorization.
5. Configure Supabase Storage bucket and RLS policies.
6. Set environment variables in CI/CD and production.
7. (Optional) Create `product_photo_audit` table and admin UI.

**No unverified product photos have been added.** All `imageUrl` values remain NULL until photos are uploaded via the verified workflow.
