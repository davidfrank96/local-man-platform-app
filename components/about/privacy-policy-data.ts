export type PrivacyPolicyBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "bullets";
      items: string[];
    }
  | {
      type: "link";
      href: string;
      label: string;
      prefix?: string;
      suffix?: string;
    };

export type PrivacyPolicySubsection = {
  key: string;
  title: string;
  blocks: PrivacyPolicyBlock[];
};

export type PrivacyPolicySection = {
  key: string;
  title: string;
  summary: string;
  blocks: PrivacyPolicyBlock[];
  subsections?: PrivacyPolicySubsection[];
};

export const OFFICIAL_PRIVACY_POLICY_LAST_UPDATED = "June 05, 2026";

export const OFFICIAL_PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
  {
    key: "summary",
    title: "Summary of Key Points",
    summary:
      "Key points from the Privacy Notice, with fuller detail available in the sections below.",
    blocks: [
      {
        type: "link",
        href: "https://localmanapp.com",
        label: "https://localmanapp.com",
        prefix: "This Privacy Notice applies when you visit our website at ",
        suffix:
          " or any website of ours that links to this Privacy Notice.",
      },
      {
        type: "bullets",
        items: [
          "When you visit, use, or navigate the Services, LocalManApp may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use.",
          "We do not process sensitive personal information.",
          "We do not collect any information from third parties.",
          "We process information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.",
          "We may share information in specific situations and with specific categories of third parties.",
          "No electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.",
          "Depending on where you are located geographically, applicable privacy law may give you certain rights regarding your personal information.",
        ],
      },
    ],
  },
  {
    key: "localman-use",
    title: "How Localman Uses Information",
    summary:
      "A plain-language explanation of how Localman uses information to run discovery, Rider Connect, ratings, sharing, and support.",
    blocks: [
      {
        type: "paragraph",
        text: "This section supplements the official Privacy Notice. It explains how Localman uses information in normal platform workflows without replacing the legal policy below.",
      },
    ],
    subsections: [
      {
        key: "operations",
        title: "Platform Operations",
        blocks: [
          {
            type: "paragraph",
            text: "Localman uses information to operate vendor discovery, rider coordination, ratings, sharing, admin management, and abuse prevention.",
          },
        ],
      },
      {
        key: "handled-info",
        title: "Information We May Handle",
        blocks: [
          {
            type: "bullets",
            items: [
              "vendor information",
              "rider information",
              "admin-entered data",
              "rider request details",
              "ratings and signals",
              "approximate location or selected area",
              "browser and device information",
            ],
          },
        ],
      },
      {
        key: "rider-privacy",
        title: "Rider Privacy",
        blocks: [
          {
            type: "bullets",
            items: [
              "Full rider phone or WhatsApp details are not shown publicly before handoff.",
              "Full rider plates are not exposed publicly.",
              "Masked plate information may appear after rider selection.",
              "Internal notes are not public.",
            ],
          },
        ],
      },
      {
        key: "whatsapp",
        title: "WhatsApp Handoff",
        blocks: [
          {
            type: "paragraph",
            text: "Continuing to WhatsApp opens a service outside Localman. WhatsApp has its own privacy practices.",
          },
          {
            type: "paragraph",
            text: "Necessary contact and request details may be shared with the selected rider for coordination.",
          },
        ],
      },
      {
        key: "retention",
        title: "Information Retention",
        blocks: [
          {
            type: "paragraph",
            text: "Localman keeps information as needed for:",
          },
          {
            type: "bullets",
            items: [
              "platform operation",
              "support",
              "admin records",
              "abuse prevention",
              "legal and safety reasons",
            ],
          },
          {
            type: "paragraph",
            text: "Retention periods may vary.",
          },
        ],
      },
      {
        key: "choices",
        title: "Your Choices",
        blocks: [
          {
            type: "paragraph",
            text: "You can choose not to submit rider request details.",
          },
          {
            type: "paragraph",
            text: "Vendors and riders may request updates or removal through available support or admin processes.",
          },
        ],
      },
      {
        key: "security",
        title: "Security",
        blocks: [
          {
            type: "paragraph",
            text: "Localman uses reasonable protections. However, no internet service can guarantee perfect security.",
          },
        ],
      },
      {
        key: "children",
        title: "Children",
        blocks: [
          {
            type: "paragraph",
            text: "Localman is not intended for children. Minors should use the platform only with a parent or guardian.",
          },
        ],
      },
      {
        key: "updates",
        title: "Policy Updates",
        blocks: [
          {
            type: "paragraph",
            text: "This policy may be updated as Localman grows.",
          },
        ],
      },
    ],
  },
  {
    key: "infocollect",
    title: "What Information Do We Collect?",
    summary:
      "We collect personal information that you provide to us and some technical information automatically when you use the Services.",
    blocks: [
      {
        type: "paragraph",
        text: "We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, participate in activities on the Services, or otherwise contact us.",
      },
      {
        type: "bullets",
        items: [
          "Personal information may include names, phone numbers, mailing addresses, contact preferences, contact or authentication data, and job titles.",
          "Geolocation Information. If you use our application, we may request access or permission to location-based information from your mobile device to provide certain location-based services.",
          "Mobile Device Data. We may collect mobile device data, including device ID, model, manufacturer, operating system, browser type and version, system configuration, carrier information, IP address, and information about features accessed.",
          "Push Notifications. We may request to send you push notifications regarding your account or certain application features. You can turn these off in your device settings.",
          "We automatically collect certain information when you visit, use, or navigate the Services, including IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, usage timestamps, and other technical information.",
          "Like many businesses, we also collect information through cookies and similar technologies.",
        ],
      },
      {
        type: "paragraph",
        text: "All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes.",
      },
      {
        type: "link",
        href: "https://policies.google.com/technologies/partner-sites",
        label: "Google API Services User Data Policy",
        prefix:
          "Our use of information received from Google APIs will adhere to the ",
        suffix: ", including the Limited Use requirements.",
      },
    ],
  },
  {
    key: "infouse",
    title: "How Do We Process Your Information?",
    summary:
      "We process information to provide and administer the Services, communicate, protect the platform, and comply with law.",
    blocks: [
      {
        type: "paragraph",
        text: "We process your personal information for a variety of reasons, depending on how you interact with our Services.",
      },
      {
        type: "bullets",
        items: [
          "To facilitate account creation and authentication and otherwise manage user accounts.",
          "To deliver and facilitate delivery of services to the user.",
          "To respond to user inquiries and offer support.",
          "To fulfill and manage orders, payments, returns, and exchanges made through the Services.",
          "To enable user-to-user communications.",
          "To deliver targeted advertising and personalized content tailored to your interests, location, and more.",
          "To protect our Services, including fraud monitoring and prevention.",
          "To evaluate and improve our Services, products, marketing, and your experience.",
          "To identify usage trends and determine the effectiveness of marketing and promotional campaigns.",
        ],
      },
    ],
  },
  {
    key: "whoshare",
    title: "When and With Whom Do We Share Your Information?",
    summary:
      "We may share information with service providers and in specific business, platform, and user-interaction situations.",
    blocks: [
      {
        type: "paragraph",
        text: "We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.",
      },
      {
        type: "bullets",
        items: [
          "Categories of third parties may include communication and collaboration tools, data analytics services, data storage service providers, performance monitoring tools, product engineering and design tools, website hosting service providers, and cloud computing services.",
          "We may share or transfer information in connection with, or during negotiations of, a merger, sale of company assets, financing, or acquisition of all or part of our business.",
          "When we use Google Maps Platform APIs, we may share information with certain Google Maps Platform APIs. Google Maps uses GPS, Wi-Fi, and cell towers to estimate your location.",
          "We may share information with affiliates and business partners, and we require affiliates to honor this Privacy Notice.",
          "When you share personal information or otherwise interact with public areas of the Services, that information may be viewed by other users and may be publicly available outside the Services.",
        ],
      },
    ],
  },
  {
    key: "cookies",
    title: "Cookies and Tracking Technologies",
    summary:
      "We may use cookies and similar technologies to collect and store information.",
    blocks: [
      {
        type: "paragraph",
        text: "We may use cookies and similar tracking technologies, such as web beacons and pixels, to gather information when you interact with our Services.",
      },
      {
        type: "paragraph",
        text: "Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.",
      },
      {
        type: "paragraph",
        text: "We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements and tailor advertisements to your interests.",
      },
    ],
  },
  {
    key: "inforetain",
    title: "How Long Do We Keep Your Information?",
    summary:
      "We keep information for as long as necessary for the purposes in the Privacy Notice unless law requires otherwise.",
    blocks: [
      {
        type: "paragraph",
        text: "We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law, such as tax, accounting, or other legal requirements.",
      },
      {
        type: "paragraph",
        text: "When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize it. If that is not possible, for example because information is stored in backup archives, we will securely store it and isolate it from further processing until deletion is possible.",
      },
    ],
  },
  {
    key: "infosafe",
    title: "How Do We Keep Your Information Safe?",
    summary:
      "We use organizational and technical measures, but no internet service can guarantee perfect security.",
    blocks: [
      {
        type: "paragraph",
        text: "We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process.",
      },
      {
        type: "paragraph",
        text: "However, despite our safeguards and efforts, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure. Transmission of personal information to and from our Services is at your own risk, and you should only access the Services within a secure environment.",
      },
    ],
  },
  {
    key: "infominors",
    title: "Do We Collect Information From Minors?",
    summary:
      "We do not knowingly collect data from or market to children under 18 years of age.",
    blocks: [
      {
        type: "paragraph",
        text: "We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information.",
      },
      {
        type: "paragraph",
        text: "If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records.",
      },
      {
        type: "link",
        href: "mailto:localmanapp@gmail.com",
        label: "localmanapp@gmail.com",
        prefix:
          "If you become aware of any data we may have collected from children under age 18, please contact us at ",
        suffix: ".",
      },
    ],
  },
  {
    key: "privacyrights",
    title: "Privacy Rights",
    summary:
      "You may review, change, or terminate your account at any time, depending on where you live.",
    blocks: [
      {
        type: "paragraph",
        text: "If we are relying on your consent to process your personal information, you have the right to withdraw your consent at any time by contacting us using the contact details in this notice.",
      },
      {
        type: "paragraph",
        text: "Withdrawing consent will not affect the lawfulness of processing before withdrawal or, where applicable law allows, processing conducted in reliance on lawful processing grounds other than consent.",
      },
      {
        type: "paragraph",
        text: "If you would like to review or change the information in your account or terminate your account, you can contact us using the contact information provided.",
      },
      {
        type: "paragraph",
        text: "Upon a request to terminate your account, we will deactivate or delete your account and information from active databases. We may retain some information to prevent fraud, troubleshoot problems, assist investigations, enforce legal terms, or comply with applicable legal requirements.",
      },
      {
        type: "paragraph",
        text: "Most web browsers accept cookies by default. You can usually set your browser to remove or reject cookies, though this could affect certain features or services.",
      },
    ],
  },
  {
    key: "dnt",
    title: "Do-Not-Track Controls",
    summary:
      "We do not currently respond to Do-Not-Track browser signals.",
    blocks: [
      {
        type: "paragraph",
        text: "Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track feature or setting. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized.",
      },
      {
        type: "paragraph",
        text: "As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard is adopted in the future, we will inform you in a revised version of this Privacy Notice.",
      },
    ],
  },
  {
    key: "otherlaws",
    title: "Region-Specific Rights",
    summary:
      "You may have additional rights based on the country you reside in.",
    blocks: [
      {
        type: "paragraph",
        text: "Republic of South Africa: you have the right to request access to or correction of your personal information by contacting us using the details in this Privacy Notice.",
      },
      {
        type: "link",
        href: "https://inforegulator.org.za/",
        label: "The Information Regulator (South Africa)",
        prefix:
          "If you are unsatisfied with how we address a complaint about our processing of personal information, you can contact ",
        suffix: ".",
      },
      {
        type: "paragraph",
        text: "General enquiries: enquiries@inforegulator.org.za. Complaints: PAIAComplaints@inforegulator.org.za and POPIAComplaints@inforegulator.org.za.",
      },
    ],
  },
  {
    key: "policyupdates",
    title: "Policy Updates",
    summary:
      "We may update this notice as necessary to stay compliant with relevant laws.",
    blocks: [
      {
        type: "paragraph",
        text: "We may update this Privacy Notice from time to time. The updated version will be indicated by an updated Revised date at the top of this Privacy Notice.",
      },
      {
        type: "paragraph",
        text: "If we make material changes, we may notify you either by prominently posting a notice of the changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently.",
      },
    ],
  },
  {
    key: "contact",
    title: "Contact",
    summary:
      "You can contact LocalManApp by email or post about this notice.",
    blocks: [
      {
        type: "link",
        href: "mailto:localmanapp@gmail.com",
        label: "localmanapp@gmail.com",
        prefix: "If you have questions or comments about this notice, email ",
        suffix: ".",
      },
      {
        type: "paragraph",
        text: "Postal contact: LocalManApp, dublin, dublin D11T0A9, Ireland.",
      },
    ],
  },
  {
    key: "request",
    title: "Review, Update, or Delete Your Data",
    summary:
      "You may have rights to request access, correction, deletion, or withdrawal of consent, depending on applicable law.",
    blocks: [
      {
        type: "paragraph",
        text: "Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information.",
      },
      {
        type: "paragraph",
        text: "You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law.",
      },
      {
        type: "link",
        href: "https://app.termly.io/dsar/c827a03e-58fb-4314-9dee-6b538d56c445",
        label: "data subject access request",
        prefix:
          "To request to review, update, or delete your personal information, please fill out and submit a ",
        suffix: ".",
      },
    ],
  },
];
