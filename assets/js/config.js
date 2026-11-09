/*
 * Site settings. This is the only file you need to edit to go live.
 *
 * Everything here is visible to anyone who views the page source, so never
 * put a password, API key, or other secret in this file.
 */
window.DP_CONFIG = {
  /*
   * Where orders are sent.
   *
   * Leave this empty until a form service is set up. While it is empty the
   * page never claims an order was sent: customers review their order and
   * then download or print the completed checklist instead.
   *
   * Recommended: a Formspree form endpoint, for example
   *   orderEndpoint: "https://formspree.io/f/abcdwxyz",
   * Formspree emails each order to the address you set in your Formspree
   * account, so no email address is stored in this site.
   *
   * Any service that accepts a standard HTML form POST (multipart/form-data)
   * and returns a 2xx status works the same way. The URL must use https.
   */
  orderEndpoint: "",

  /*
   * DartPoints facilities shown in the "Location address" dropdown.
   *
   * Add one entry per facility. Customers pick by name; the address is
   * shown under the dropdown and included in the order.
   *
   * If this list is emptied, customers type the address instead.
   */
  facilities: [
    { name: "Asheville, NC", address: "100 Technology Dr Ste C, Asheville, NC 28803, USA" },
    { name: "Baton Rouge, LA", address: "7127 Florida Blvd, Baton Rouge, LA 70806, USA" },
    { name: "Charleston, SC", address: "8480 Palmetto Commerce Pkwy, Ladson, SC 29456, USA" },
    { name: "Cincinnati, OH", address: "302 W 3rd St Unit 400, Cincinnati, OH 45202, USA" },
    { name: "Columbia, SC", address: "1000 Catawba St Ste 180, Columbia, SC 29201, USA" },
    { name: "Columbus, IN", address: "2425 Technology Blvd, Columbus, IN 47201, USA" },
    { name: "Dublin, OH", address: "565 Metro Pl S Ste 300, Dublin, OH 43017, USA" },
    { name: "Greenville, SC", address: "78 Global Dr #100, Greenville, SC 29607, USA" },
    { name: "Shreveport, LA", address: "601 Milam St, Shreveport, LA 71101, USA" },
    { name: "Spartanburg, SC", address: "5700 N Blackstock Rd, Spartanburg, SC 29303, USA" }
  ],

  /*
   * Shown when orderEndpoint is empty, telling customers what to do with
   * their completed checklist.
   */
  manualSubmitNote:
    "Online ordering isn't connected yet, so this page can't send your order. " +
    "Download or print the completed checklist and send it to your DartPoints contact."
};
