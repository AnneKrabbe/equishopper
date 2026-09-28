import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase server-miljøvariabler mangler.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return { error: "Ikke logget ind.", status: 401 } as const;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return { error: "Ugyldig eller udløbet session.", status: 401 } as const;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Admin-profil kunne ikke hentes:", profileError);
    return { error: "Admin-adgang kunne ikke kontrolleres.", status: 500 } as const;
  }

  if (profile?.role !== "admin") {
    return { error: "Du har ikke adgang til denne handling.", status: 403 } as const;
  }

  return { user } as const;
}

type CreateListingBody = {
  sellerId?: string;
  title?: string;
  price?: number;
  mainCategory?: string;
  category?: string | null;
  subcategory?: string;
  brand?: string;
  size?: string | null;
  color?: string | null;
  condition?: string;
  fallbackLocation?: string | null;
  shippingAvailable?: boolean;
  pickupAvailable?: boolean;
  shippingProductId?: string | null;
  receipt?: boolean;
  description?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    if ("error" in admin) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status },
      );
    }

    const body = (await request.json()) as CreateListingBody;

    if (!body.sellerId) {
      return NextResponse.json(
        { error: "Vælg den bruger, annoncen skal oprettes for." },
        { status: 400 },
      );
    }

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "Angiv en titel." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(body.price) || Number(body.price) < 0) {
      return NextResponse.json(
        { error: "Angiv en gyldig pris." },
        { status: 400 },
      );
    }

    if (!body.mainCategory || !body.subcategory || !body.brand || !body.condition) {
      return NextResponse.json(
        { error: "Annonceoplysningerne er ikke komplette." },
        { status: 400 },
      );
    }

    if (!body.shippingAvailable && !body.pickupAvailable) {
      return NextResponse.json(
        { error: "Vælg mindst én leveringsmulighed." },
        { status: 400 },
      );
    }

    const { data: sellerProfile, error: sellerProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, postal_code, city, latitude, longitude")
        .eq("id", body.sellerId)
        .maybeSingle();

    if (sellerProfileError) {
      console.error("Sælgerprofil kunne ikke hentes:", sellerProfileError);
      return NextResponse.json(
        { error: "Sælgerens profil kunne ikke hentes." },
        { status: 500 },
      );
    }

    if (!sellerProfile) {
      return NextResponse.json(
        { error: "Den valgte bruger findes ikke." },
        { status: 404 },
      );
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .insert({
        seller_id: body.sellerId,
        title: body.title.trim(),
        price: Number(body.price),
        main_category: body.mainCategory,
        category: body.category || null,
        subcategory: body.subcategory,
        brand: body.brand,
        size: body.size || null,
        color: body.color || null,
        condition: body.condition,
        location:
          sellerProfile.city ||
          sellerProfile.postal_code ||
          body.fallbackLocation ||
          null,
        postal_code: sellerProfile.postal_code || null,
        city: sellerProfile.city || null,
        latitude: sellerProfile.latitude ?? null,
        longitude: sellerProfile.longitude ?? null,
        shipping_available: Boolean(body.shippingAvailable),
        pickup_available: Boolean(body.pickupAvailable),
        shipping_product_id: body.shippingAvailable
          ? body.shippingProductId || null
          : null,
        receipt: Boolean(body.receipt),
        description: body.description?.trim() || null,
        favorite_count: 0,
        view_count: 0,
        is_we_love: false,
      })
      .select("id")
      .single();

    if (listingError || !listing) {
      console.error("Admin-annonce kunne ikke oprettes:", listingError);
      return NextResponse.json(
        { error: listingError?.message ?? "Annoncen kunne ikke oprettes." },
        { status: 500 },
      );
    }

    return NextResponse.json({ listingId: listing.id });
  } catch (error) {
    console.error("POST /api/admin/listings fejlede:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Der opstod en ukendt serverfejl.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    if ("error" in admin) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status },
      );
    }

    const formData = await request.formData();
    const listingId = formData.get("listingId");
    const sortOrderValue = formData.get("sortOrder");
    const image = formData.get("image");

    if (typeof listingId !== "string" || !listingId) {
      return NextResponse.json(
        { error: "Annonce-id mangler." },
        { status: 400 },
      );
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Billedfil mangler." },
        { status: 400 },
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Filen er ikke et gyldigt billede." },
        { status: 400 },
      );
    }

    const sortOrder = Number(sortOrderValue ?? 0);

    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9) {
      return NextResponse.json(
        { error: "Ugyldig billedrækkefølge." },
        { status: 400 },
      );
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id")
      .eq("id", listingId)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Annoncen findes ikke." },
        { status: 404 },
      );
    }

    const originalExtension = image.name.split(".").pop() || "jpg";
    const safeExtension =
      originalExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `${listingId}/${crypto.randomUUID()}-${sortOrder}.${safeExtension}`;
    const imageBuffer = Buffer.from(await image.arrayBuffer());

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("listing-images")
      .upload(filePath, imageBuffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Admin-billede kunne ikke uploades:", uploadError);
      return NextResponse.json(
        { error: `Billedet kunne ikke uploades: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("listing-images")
      .getPublicUrl(uploadData.path);

    const { error: imageRowError } = await supabaseAdmin
      .from("listing_images")
      .insert({
        listing_id: listingId,
        image_url: publicUrlData.publicUrl,
        sort_order: sortOrder,
      });

    if (imageRowError) {
      console.error("listing_images kunne ikke oprettes:", imageRowError);
      await supabaseAdmin.storage
        .from("listing-images")
        .remove([uploadData.path]);

      return NextResponse.json(
        { error: `Billedet kunne ikke knyttes til annoncen: ${imageRowError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/admin/listings fejlede:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Der opstod en ukendt serverfejl.",
      },
      { status: 500 },
    );
  }
}
