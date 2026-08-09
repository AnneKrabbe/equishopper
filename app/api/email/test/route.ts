import { NextRequest, NextResponse } from "next/server";

import {
  sendCounterOfferEmail,
  sendItemShippedEmail,
  sendItemSoldEmail,
  sendNewMessageEmail,
  sendNewOfferEmail,
  sendOfferAcceptedEmail,
  sendOfferRejectedEmail,
  sendOrderConfirmationEmail,
  sendReviewReminderEmail,
} from "@/lib/email/email-service";

const EMAIL_TYPES = [
  "new-offer",
  "counter-offer",
  "offer-accepted",
  "offer-rejected",
  "new-message",
  "order-confirmation",
  "item-sold",
  "item-shipped",
  "review-reminder",
] as const;

type EmailType = (typeof EMAIL_TYPES)[number];

type TestEmailBody = {
  email?: string;
  name?: string;
  type?: EmailType;
};

function isEmailType(value: unknown): value is EmailType {
  return (
    typeof value === "string" &&
    EMAIL_TYPES.includes(value as EmailType)
  );
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;
    const providedSecret = request.headers.get("x-email-secret");

    if (!expectedSecret) {
      throw new Error(
        "EMAIL_WEBHOOK_SECRET mangler i miljøvariablerne.",
      );
    }

    if (providedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          error: "Ugyldig adgang.",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as TestEmailBody;

    const email = body.email?.trim();
    const name = body.name?.trim() || "Anne";
    const emailType = body.type ?? "new-offer";

    if (!email) {
      return NextResponse.json(
        {
          error: "E-mailadresse mangler.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isEmailType(emailType)) {
      return NextResponse.json(
        {
          error: "Ukendt mailtype.",
          allowedTypes: EMAIL_TYPES,
        },
        {
          status: 400,
        },
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    const recipient = {
      email,
      name,
    };

    const listingTitle = 'Kentaur Ithaka dressursadel 17,5"';

    const listingImageUrl =
      "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80";

    let result: { id?: string | null };

    switch (emailType) {
      case "new-offer": {
        result = await sendNewOfferEmail({
          to: recipient,
          props: {
            sellerName: name,
            buyerName: "Maria Nielsen",
            listingTitle,
            listingImageUrl,
            listingPrice: "8.500 kr.",
            offerAmount: "7.500 kr.",
            offerMessage:
              "Hej 😊\n\nJeg er meget interesseret i sadlen og kan hente den i weekenden.\n\nVenlig hilsen\nMaria",
            offerUrl: `${appUrl}/offers/test`,
          },
        });

        break;
      }

      case "counter-offer": {
        result = await sendCounterOfferEmail({
          to: recipient,
          props: {
            recipientName: name,
            senderName: "Anne",
            listingTitle,
            listingImageUrl,
            listingPrice: "8.500 kr.",
            originalOfferAmount: "7.500 kr.",
            counterOfferAmount: "8.000 kr.",
            counterOfferMessage:
              "Tak for dit bud. Jeg kan tilbyde sadlen til 8.000 kr., hvis du fortsat er interesseret.",
            offerUrl: `${appUrl}/offers/test`,
          },
        });

        break;
      }

      case "offer-accepted": {
        result = await sendOfferAcceptedEmail({
          to: recipient,
          props: {
            buyerName: name,
            sellerName: "Anne",
            listingTitle,
            listingImageUrl,
            listingPrice: "8.500 kr.",
            acceptedAmount: "7.500 kr.",
            sellerMessage:
              "Tak for dit bud. Jeg har accepteret det og glæder mig til at få handlen på plads.",
            checkoutUrl: `${appUrl}/checkout/test`,
          },
        });

        break;
      }

      case "offer-rejected": {
        result = await sendOfferRejectedEmail({
          to: recipient,
          props: {
            recipientName: name,
            sellerName: "Anne",
            listingTitle,
            listingImageUrl,
            listingPrice: "8.500 kr.",
            offerAmount: "7.500 kr.",
            browseUrl: `${appUrl}/listings`,
          },
        });

        break;
      }

      case "new-message": {
        result = await sendNewMessageEmail({
          to: recipient,
          props: {
            recipientName: name,
            senderName: "Maria Nielsen",
            listingTitle,
            listingImageUrl,
            message:
              "Hej 😊\n\nJeg ville høre, om sadlen stadig er til salg?\n\nHvis ja, vil jeg meget gerne komme og se den i denne uge.\n\nVenlig hilsen\nMaria",
            conversationUrl: `${appUrl}/messages/test`,
          },
        });

        break;
      }

      case "order-confirmation": {
        result = await sendOrderConfirmationEmail({
          to: recipient,
          props: {
            buyerName: name,
            sellerName: "Anne",
            listingTitle,
            listingImageUrl,
            itemPrice: "8.000 kr.",
            shippingPrice: "79 kr.",
            totalPrice: "8.079 kr.",
            orderNumber: "EQ-2026-00123",
            orderUrl: `${appUrl}/orders/test`,
          },
        });

        break;
      }

      case "item-sold": {
        result = await sendItemSoldEmail({
          to: recipient,
          props: {
            sellerName: name,
            buyerName: "Maria Nielsen",
            listingTitle,
            listingImageUrl,
            salePrice: "8.000 kr.",
            orderUrl: `${appUrl}/orders/test`,
          },
        });

        break;
      }

      case "item-shipped": {
        result = await sendItemShippedEmail({
          to: recipient,
          props: {
            buyerName: name,
            sellerName: "Anne",
            listingTitle,
            listingImageUrl,
            totalPrice: "8.079 kr.",
            carrierName: "PostNord",
            trackingNumber: "00370730200012345678",
            trackingUrl: `${appUrl}/orders/test/tracking`,
            orderUrl: `${appUrl}/orders/test`,
          },
        });

        break;
      }

      case "review-reminder": {
        result = await sendReviewReminderEmail({
          to: recipient,
          props: {
            recipientName: name,
            otherPartyName: "Anne",
            listingTitle,
            listingImageUrl,
            transactionRole: "buyer",
            reviewUrl: `${appUrl}/orders/test/review`,
          },
        });

        break;
      }

      default: {
        const exhaustiveCheck: never = emailType;
        throw new Error(
          `Mailtypen understøttes ikke: ${exhaustiveCheck}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      type: emailType,
      emailId: result.id ?? null,
    });
  } catch (error) {
    console.error("Testmail-fejl:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Testmailen kunne ikke sendes.",
      },
      {
        status: 500,
      },
    );
  }
}