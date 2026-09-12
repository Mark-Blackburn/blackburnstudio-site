import { describe, expect, it } from "vitest";

import { createContactEmailContent } from "./contactEmail";

describe("createContactEmailContent", () => {
  it("renders a normal address as readable text and a URI-safe mailto link", () => {
    const content = createContactEmailContent(
      {
        name: "Test Person",
        email: "mark@example.com",
        phone: "",
        services: ["new-website"],
        setup: "no-setup",
        message: "Please help with this website.",
        contactMethod: "email",
        timing: "",
        requiredDate: "",
      },
      "17/05/2027, 10:30:00 am",
    );

    expect(content.html).toContain(">mark@example.com</a>");
    expect(content.html).toContain('href="mailto:mark%40example.com"');
  });

  it("encodes URI delimiters as part of the mailto address", () => {
    const email = "attacker@example.com?bcc=evil%40example.com&x=y#fragment";
    const content = createContactEmailContent(
      {
        name: "Test Person",
        email,
        phone: "",
        services: ["new-website"],
        setup: "no-setup",
        message: "Please help with this website.",
        contactMethod: "email",
        timing: "",
        requiredDate: "",
      },
      "17/05/2027, 10:30:00 am",
    );

    expect(content.html).toContain(
      ">attacker@example.com?bcc=evil%40example.com&amp;x=y#fragment</a>",
    );
    expect(content.html).not.toContain('href="mailto:attacker@example.com?bcc=');
    expect(content.html).toContain(
      'href="mailto:attacker%40example.com%3Fbcc%3Devil%2540example.com%26x%3Dy%23fragment"',
    );
  });

  it("preserves the established subject and plain-text email format", () => {
    const content = createContactEmailContent(
      {
        name: "Test Person",
        email: "test@example.com",
        phone: "+61412345678",
        services: ["new-website"],
        setup: "no-setup",
        message: "Please help with this website.",
        contactMethod: "email",
        timing: "one-month",
        requiredDate: "2027-05-17",
      },
      "17/05/2027, 10:30:00 am",
    );

    expect(content.subject).toBe(
      "New Blackburn Studio enquiry — New website — Test Person",
    );
    expect(content.text).toBe(`New Blackburn Studio Enquiry

Name: Test Person
Email: test@example.com
Phone: +61412345678

Services requested:
- New website

Existing setup: No — this is something new

Preferred contact method: Email
Timing: Within the next month
Required date: 2027-05-17

Details:
Please help with this website.

---
Submitted: 17/05/2027, 10:30:00 am
`);
  });

  it("escapes attacker-controlled values in HTML while retaining plain text", () => {
    const content = createContactEmailContent(
      {
        name: `Test <script>alert("name")</script>`,
        email: `test+"quote"@example.com`,
        phone: "",
        services: ["photography", "other"],
        setup: "",
        message: `<img src=x onerror="alert('message')">`,
        contactMethod: "either",
        timing: "",
        requiredDate: "",
      },
      `17/05/2027 <unsafe>`,
    );

    expect(content.subject).toBe(
      `New Blackburn Studio enquiry — Mixed services — Test <script>alert("name")</script>`,
    );
    expect(content.text).toContain(`<img src=x onerror="alert('message')">`);
    expect(content.html).not.toContain("<script>");
    expect(content.html).not.toContain("<img src=x");
    expect(content.html).toContain(
      "Test &lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;",
    );
    expect(content.html).toContain(
      "&lt;img src=x onerror=&quot;alert(&#39;message&#39;)&quot;&gt;",
    );
    expect(content.html).toContain("17/05/2027 &lt;unsafe&gt;");
  });
});
