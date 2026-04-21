import { vi } from "vitest";

// Mock the entire twilio module so integration tests never hit the network.
// Every call to `new Twilio(...).messages.create(...)` returns a deterministic
// fake sid with status "queued" (sendSms maps queued → "sent").
vi.mock("twilio", () => {
  let counter = 0;

  function Twilio(this: any, _accountSid: string, _authToken: string) {
    this.messages = {
      create: vi.fn().mockImplementation(async (opts: { to: string; body?: string }) => {
        counter += 1;
        return {
          sid: `SM_mock_${counter.toString().padStart(8, "0")}`,
          status: "queued",
          to: opts.to,
          body: opts.body ?? "",
        };
      }),
      list: vi.fn().mockResolvedValue([]),
    };
  }

  const TwilioMock = vi.fn().mockImplementation(function (
    this: any,
    accountSid: string,
    authToken: string,
  ) {
    Twilio.call(this, accountSid, authToken);
  });

  return { Twilio: TwilioMock, default: TwilioMock };
});
