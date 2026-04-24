import { Twilio } from "twilio"

export interface SmsResult {
  sid: string
  status: string
  error?: string
}

/**
 * Send an SMS message via Twilio.
 * Returns the Twilio message SID and status.
 */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    const error = "Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    console.error(`[sms] ${error}`)
    return { sid: "", status: "failed", error }
  }

  // SMS_DRY_RUN: skip Twilio, log to console, return mock result
  if (process.env.SMS_DRY_RUN === "true") {
    console.log(`[sms] DRY RUN to ${to}: ${message}`);
    return { sid: "dry-run", status: "sent" };
  }

  try {
    const client = new Twilio(accountSid, authToken)
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })

    console.log(`[sms] Sending to ${to} → sid: ${result.sid}, status: ${result.status}`)

    return {
      sid: result.sid,
      status: result.status === "queued" || result.status === "sent" ? "sent" : "failed",
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error(`[sms] Sending to ${to} → FAILED: ${errorMessage}`)
    return { sid: "", status: "failed", error: errorMessage }
  }
}

/**
 * Format the SMS notification message for a farmer.
 */
export function formatRouteSmsMessage(params: {
  hubName: string
  routeDate: string
  responseUrl: string
  hubPhone: string
  hubEmail: string
  farmerId: string
}): string {
  const { hubName, routeDate, responseUrl, hubPhone, hubEmail, farmerId } = params
  const baseUrl = process.env.BASE_URL || "http://localhost:3000"
  const unsubscribeUrl = `${baseUrl}/unsubscribe?farmer=${farmerId}`
  return `${hubName} has a delivery route near you on ${routeDate}. Tap to respond: ${responseUrl} Questions? Contact ${hubPhone} or ${hubEmail}. Reply STOP or tap to unsubscribe: ${unsubscribeUrl}`
}

/**
 * Format the SMS summary sent to the admin when a route is created.
 */
export function formatRouteCreatedAdminSms(params: {
  title: string
  startTime: string
  endTime: string
  hubName: string
  hubPhone: string
  hubEmail: string
  notes?: string | null
}): string {
  const { title, startTime, endTime, hubName, hubPhone, hubEmail, notes } = params
  const start = new Date(startTime).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  })
  const end = new Date(endTime).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  })
  const lines = [
    `Route saved: ${title}`,
    `${start} → ${end}`,
    `Hub: ${hubName} (${hubPhone}, ${hubEmail})`,
  ]
  if (notes) lines.push(`Notes: ${notes}`)
  return lines.join("\n")
}