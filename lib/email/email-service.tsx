import { Resend } from "resend";

import { CounterOfferEmail } from "@/emails/templates/counter-offer";
import { ItemShippedEmail } from "@/emails/templates/item-shipped";
import { ItemSoldEmail } from "@/emails/templates/item-sold";
import NewMessageEmail from "@/emails/templates/new-message";
import { NewOfferEmail } from "@/emails/templates/new-offer";
import { OfferAcceptedEmail } from "@/emails/templates/offer-accepted";
import { OfferRejectedEmail } from "@/emails/templates/offer-rejected";
import { OrderConfirmationEmail } from "@/emails/templates/order-confirmation";
import { PaymentReleasedBuyerEmail } from "@/emails/templates/payment-released-buyer";
import { PaymentReleasedSellerEmail } from "@/emails/templates/payment-released-seller";
import { ReviewReminderEmail } from "@/emails/templates/review-reminder";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom =
  process.env.EMAIL_FROM ?? "Equishopper <noreply@updates.equishopper.dk>";

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY mangler i miljøvariablerne.");
}

const resend = new Resend(resendApiKey);

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

type SendEmailResult = {
  id: string;
};

async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: EmailRecipient;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const recipient = to.name ? `${to.name} <${to.email}>` : to.email;

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: recipient,
    subject,
    react,
    replyTo,
  });

  if (error) {
    throw new Error(
      `Kunne ikke sende e-mail til ${to.email}: ${error.message}`,
    );
  }

  if (!data?.id) {
    throw new Error(`Resend returnerede ikke et id for e-mailen til ${to.email}.`);
  }

  return { id: data.id };
}

export async function sendNewOfferEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof NewOfferEmail>;
}) {
  return sendEmail({
    to,
    subject: `Nyt bud på ${props.listingTitle}`,
    react: <NewOfferEmail {...props} />,
  });
}

export async function sendCounterOfferEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof CounterOfferEmail>;
}) {
  return sendEmail({
    to,
    subject: `Du har fået et modbud på ${props.listingTitle}`,
    react: <CounterOfferEmail {...props} />,
  });
}

export async function sendOfferAcceptedEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof OfferAcceptedEmail>;
}) {
  return sendEmail({
    to,
    subject: `Dit bud på ${props.listingTitle} er accepteret`,
    react: <OfferAcceptedEmail {...props} />,
  });
}

export async function sendOfferRejectedEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof OfferRejectedEmail>;
}) {
  return sendEmail({
    to,
    subject: `Dit bud på ${props.listingTitle} blev ikke accepteret`,
    react: <OfferRejectedEmail {...props} />,
  });
}

export async function sendNewMessageEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof NewMessageEmail>;
}) {
  return sendEmail({
    to,
    subject: `Ny besked fra ${props.senderName}`,
    react: <NewMessageEmail {...props} />,
  });
}

export async function sendItemSoldEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof ItemSoldEmail>;
}) {
  return sendEmail({
    to,
    subject: props.payoutSetupRequired
      ? `Din vare er solgt – aktivér udbetaling: ${props.listingTitle}`
      : `Din vare er solgt: ${props.listingTitle}`,
    react: <ItemSoldEmail {...props} />,
  });
}

export async function sendOrderConfirmationEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof OrderConfirmationEmail>;
}) {
  return sendEmail({
    to,
    subject: `Ordrebekræftelse: ${props.listingTitle}`,
    react: <OrderConfirmationEmail {...props} />,
  });
}

export async function sendItemShippedEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof ItemShippedEmail>;
}) {
  return sendEmail({
    to,
    subject: `Din vare er sendt: ${props.listingTitle}`,
    react: <ItemShippedEmail {...props} />,
  });
}

export async function sendReviewReminderEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof ReviewReminderEmail>;
}) {
  return sendEmail({
    to,
    subject: `Hvordan gik handlen med ${props.listingTitle}?`,
    react: <ReviewReminderEmail {...props} />,
  });
}

export async function sendPaymentReleasedSellerEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof PaymentReleasedSellerEmail>;
}) {
  return sendEmail({
    to,
    subject: `Din betaling er frigivet: ${props.listingTitle}`,
    react: <PaymentReleasedSellerEmail {...props} />,
  });
}

export async function sendPaymentReleasedBuyerEmail({
  to,
  props,
}: {
  to: EmailRecipient;
  props: React.ComponentProps<typeof PaymentReleasedBuyerEmail>;
}) {
  return sendEmail({
    to,
    subject: `Din handel er gennemført: ${props.listingTitle}`,
    react: <PaymentReleasedBuyerEmail {...props} />,
  });
}

/*
 * Outbox-format:
 * {
 *   "to": { "email": "...", "name": "..." },
 *   "props": { ...template props... }
 * }
 *
 * template_key bestemmer hvilken af de eksisterende send-funktioner der bruges.
 */
export type EmailOutboxPayload = {
  to: EmailRecipient;
  props: Record<string, unknown>;
};

export async function sendEmailFromOutbox(
  templateKey: string,
  payload: unknown,
): Promise<SendEmailResult> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Ugyldigt payload i email_outbox.");
  }

  const parsed = payload as Partial<EmailOutboxPayload>;

  if (
    !parsed.to ||
    typeof parsed.to !== "object" ||
    typeof parsed.to.email !== "string" ||
    !parsed.to.email.trim()
  ) {
    throw new Error("email_outbox payload mangler modtagerens e-mail.");
  }

  if (!parsed.props || typeof parsed.props !== "object") {
    throw new Error("email_outbox payload mangler props.");
  }

  const to = parsed.to as EmailRecipient;

  switch (templateKey) {
    case "new_offer":
      return sendNewOfferEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof NewOfferEmail>,
      });

    case "counter_offer":
      return sendCounterOfferEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof CounterOfferEmail>,
      });

    case "offer_accepted":
      return sendOfferAcceptedEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof OfferAcceptedEmail>,
      });

    case "offer_rejected":
      return sendOfferRejectedEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof OfferRejectedEmail>,
      });

    case "new_message":
      return sendNewMessageEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof NewMessageEmail>,
      });

    case "item_sold":
      return sendItemSoldEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof ItemSoldEmail>,
      });

    case "order_confirmation":
      return sendOrderConfirmationEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof OrderConfirmationEmail>,
      });

    case "item_shipped":
      return sendItemShippedEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof ItemShippedEmail>,
      });

    case "review_reminder":
      return sendReviewReminderEmail({
        to,
        props: parsed.props as React.ComponentProps<typeof ReviewReminderEmail>,
      });

    case "payment_released_seller":
      return sendPaymentReleasedSellerEmail({
        to,
        props: parsed.props as React.ComponentProps<
          typeof PaymentReleasedSellerEmail
        >,
      });

    case "payment_released_buyer":
      return sendPaymentReleasedBuyerEmail({
        to,
        props: parsed.props as React.ComponentProps<
          typeof PaymentReleasedBuyerEmail
        >,
      });

    default:
      throw new Error(`Ukendt email_outbox template_key: ${templateKey}`);
  }
}
