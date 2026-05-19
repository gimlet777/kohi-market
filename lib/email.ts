import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? "orders@kohi-market.com"

export interface OrderEmailItem {
  productName: string
  roasterName: string
  formatName: string
  grams: number
  unitPrice: number
  quantity: number
}

// ─── Buyer confirmation ───────────────────────────────────────────────────────

export async function sendBuyerConfirmation({
  to,
  buyerName,
  items,
  totalAmount,
  orderRef,
}: {
  to: string
  buyerName: string
  items: OrderEmailItem[]
  totalAmount: number
  orderRef: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Your KOHĪ order is confirmed",
    html: buyerEmailHtml({ buyerName, items, totalAmount, orderRef }),
  })
}

// ─── Roaster notification ─────────────────────────────────────────────────────

export async function sendRoasterNotification({
  to,
  roasterName,
  items,
  buyerName,
  buyerEmail,
  shippingAddress,
  orderRef,
}: {
  to: string
  roasterName: string
  items: OrderEmailItem[]
  buyerName: string
  buyerEmail: string
  shippingAddress: string
  orderRef: string
}) {
  const productList = items.map(i => i.productName).join(", ")
  return resend.emails.send({
    from: FROM,
    to,
    subject: `New KOHĪ order — ${productList}`,
    html: roasterEmailHtml({ roasterName, items, buyerName, buyerEmail, shippingAddress, orderRef }),
  })
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f5f2;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#34150F;padding:28px 40px;border-radius:16px 16px 0 0;">
            <span style="font-family:Georgia,serif;font-size:26px;color:#C8965A;letter-spacing:3px;">KOHĪ</span>
            <span style="font-family:Georgia,serif;font-size:13px;color:#78716c;margin-left:10px;letter-spacing:1px;">珈琲市</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-left:1px solid #e7e5e4;border-right:1px solid #e7e5e4;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#34150F;padding:24px 40px;text-align:center;border-radius:0 0 16px 16px;">
            <p style="margin:0;font-family:Georgia,serif;color:#C8965A;font-size:16px;letter-spacing:2px;">KOHĪ</p>
            <p style="margin:8px 0 0;color:#78716c;font-size:11px;letter-spacing:2px;">珈琲市 · Specialty Coffee Marketplace</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      item => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f5f5f4;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#34150F;font-weight:bold;">${item.productName}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#78716c;">${item.roasterName}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#a8a29e;">
            ${item.formatName}${item.grams > 0 ? ` · ${item.grams}g` : ""}
          </p>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #f5f5f4;text-align:right;vertical-align:top;white-space:nowrap;">
          <p style="margin:0;font-size:14px;color:#34150F;">¥${(item.unitPrice * item.quantity).toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#a8a29e;">¥${item.unitPrice.toLocaleString()} × ${item.quantity}</p>
        </td>
      </tr>`
    )
    .join("")

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <th style="text-align:left;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#a8a29e;padding-bottom:10px;font-weight:normal;">Item</th>
      <th style="text-align:right;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#a8a29e;padding-bottom:10px;font-weight:normal;">Total</th>
    </tr>
    ${rows}
  </table>`
}

function buyerEmailHtml({
  buyerName,
  items,
  totalAmount,
  orderRef,
}: {
  buyerName: string
  items: OrderEmailItem[]
  totalAmount: number
  orderRef: string
}): string {
  const firstName = buyerName.split(" ")[0] || "there"
  const refShort = orderRef.slice(-8).toUpperCase()

  const content = `
    <h2 style="margin:0 0 6px;font-size:26px;color:#34150F;font-weight:normal;">Order confirmed</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#78716c;">Thank you, ${firstName}. Your coffee is on its way soon.</p>
    <p style="margin:0 0 32px;font-size:12px;color:#a8a29e;letter-spacing:1px;">Order ref: #${refShort}</p>

    ${itemsTable(items)}

    <!-- Total -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 0 0;border-top:2px solid #34150F;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:bold;color:#34150F;">Order total</td>
              <td style="text-align:right;font-size:20px;font-weight:bold;color:#34150F;">¥${totalAmount.toLocaleString()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:32px 0 0;font-size:13px;color:#78716c;line-height:1.6;">
      Your roaster will prepare your order fresh and ship it with care.
      You'll receive a shipping notification when it's on its way.
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#78716c;line-height:1.6;">
      Questions? Reply to this email and we'll help.
    </p>
  `
  return emailShell(content)
}

function roasterEmailHtml({
  roasterName,
  items,
  buyerName,
  buyerEmail,
  shippingAddress,
  orderRef,
}: {
  roasterName: string
  items: OrderEmailItem[]
  buyerName: string
  buyerEmail: string
  shippingAddress: string
  orderRef: string
}): string {
  const refShort = orderRef.slice(-8).toUpperCase()
  const orderTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  const content = `
    <h2 style="margin:0 0 6px;font-size:26px;color:#34150F;font-weight:normal;">New order</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#78716c;">Hi ${roasterName}, you have a new order on KOHĪ.</p>
    <p style="margin:0 0 32px;font-size:12px;color:#a8a29e;letter-spacing:1px;">Order ref: #${refShort}</p>

    ${itemsTable(items)}

    <!-- Order total -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 0 24px;border-top:2px solid #34150F;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:bold;color:#34150F;">Order total</td>
              <td style="text-align:right;font-size:20px;font-weight:bold;color:#34150F;">¥${orderTotal.toLocaleString()}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Customer details -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;border-radius:10px;margin-top:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 14px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#a8a29e;">Ship to</p>
          <p style="margin:0 0 4px;font-size:14px;color:#34150F;font-weight:bold;">${buyerName}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#78716c;">${buyerEmail}</p>
          <p style="margin:0;font-size:13px;color:#78716c;line-height:1.6;">${shippingAddress}</p>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#78716c;line-height:1.6;">
      Please prepare and ship this order within your usual turnaround time.
      Reply to this email if you have any questions.
    </p>
  `
  return emailShell(content)
}
