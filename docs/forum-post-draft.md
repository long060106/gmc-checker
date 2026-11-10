# Evergreen forum post — draft (Long posts it; read each forum's self-promotion rules first)

**Title:** Merchant Center "Website needs improvement" / misrepresentation on Shopify — what Google's help pages actually list, and where each fix lives in Shopify

---

Google's suspension notices are short, but its help pages list concrete things reviewers look at. I went through them and mapped each one to the Shopify setting that fixes it. Links go to Google's own pages so you can check the wording yourself.

**1. Contact details** — Google's [Editorial requirements](https://support.google.com/merchants/answer/17233876) ask for "clear, accessible contact details" that match what's in your Merchant Center account.
- Shopify: create a Contact page (Online Store → Pages) and link it in the header or footer menu (Content → Menus).
- Make the email, phone and address on your site match Merchant Center → Settings → Business info, character for character.

**2. Return and refund policy** — the same page asks for "timeframes, return methods, shipping fees, and refund processing" details.
- Shopify: Settings → Policies → Return and refund policy. Make sure it states the number of days, how to send items back, who pays return shipping, and when/how refunds are issued. Link it in the footer.

**3. Business name** — Google's [trust guidance](https://support.google.com/merchants/answer/13693865) asks for "the official business name that you use across the web".
- Use one exact name everywhere: Merchant Center business info, your site title (Settings → Store details), footer, and policies. "ABC Company" in Merchant Center but "abccompany.com" on the site is a mismatch.

**4. Placeholders and broken links** — Google's [store-functionality fix page](https://support.google.com/merchants/answer/12056511) mentions "Lorem Ipsum", default template images, 404s, and links that bounce to the home page.
- Shopify: check every theme section for default text like "Talk about your brand", and every footer/menu link. Social icons pointing to facebook.com/shopify are a theme default.

**5. Prices** — Google compares the price in your feed with the price in your page's HTML, and says ["Prices added by JavaScript after load can trigger an error"](https://support.google.com/merchants/answer/6098334).
- Check a product page with Google's [Rich Results Test](https://search.google.com/test/rich-results): the structured-data price should equal the price shown.

**6. Store must be public** — a password page or forced login makes the store "inaccessible".
- Shopify: Online Store → Preferences → turn off password protection before requesting a review.

**Before you click "Request review":** Google's [review page](https://support.google.com/merchants/answer/13585221) says reviews can take up to 2 weeks, and after a second unsuccessful attempt a cooldown "may increase with each unsuccessful review". So fix everything first, then request once.

*Disclosure:* I built a free checker that runs these checks on a Shopify storefront and shows the evidence for each one: <LINK TO /scan>. It's independent, not affiliated with Google, and it can't tell you whether you'll be reinstated — only Google decides that. Happy to hear what I've missed.
