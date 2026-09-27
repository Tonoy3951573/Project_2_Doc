/* ==========================================================================
   i18n.js — chrome strings (sidebar part names, buttons, search, pager).
   Long-form prose that belongs to a chapter lives in the chapter files as
   {en, bn} pairs; only shell/UI text belongs here.
   ========================================================================== */
(function (global) {
  "use strict";

  global.DOC_UI = {
    en: {
      skipToContent: "Skip to content",
      brandSub: "Architecture & Code Reference",
      search: "Search",
      searchPlaceholder: "Search {n} chapters…",
      nav: "navigate",
      open: "open",
      close: "close",
      copy: "Copy",
      copied: "Copied",
      onThisPage: "On this page",
      previous: "Previous",
      next: "Next",
      toTop: "Back to top",
      noResults: "No matches. Try a different word.",
      minChars: "Type at least two characters.",
      readingTime: "min read",
      sourceDoc: "Original ARCHITECTURE.md",
      allChapters: "All chapters",
      wordCount: "words",
      sections: "sections",
      legacy: "Print this chapter",
      sourceNote: "The English and বাংলা editions carry identical content. Use the EN / বাংলা switch in the header to read either; your choice is remembered.",
      provenanceText: "This site is a faithful but expanded rendering of `ARCHITECTURE.md` (2,017 lines) into a browsable, searchable, bilingual format. Nothing here is invented: every number, table and code listing comes from that document. Chapters marked *extended* go beyond it — they are additions built from the same source material and are labelled as such. The Java sources described here are not part of this repository, so all code quotations are the ones printed in the document.",
      part: {
        start: "Start here",
        foundations: "Foundations",
        code: "Architecture & code",
        runtime: "Data, runtime & performance",
        ops: "Rationale & operations",
        reference: "Reference",
        extended: "Extended guide"
      }
    },

    bn: {
      skipToContent: "মূল বিষয়বস্তুতে যান",
      brandSub: "আর্কিটেকচার ও কোড রেফারেন্স",
      search: "খুঁজুন",
      searchPlaceholder: "{n}টি অধ্যায়ে খুঁজুন…",
      nav: "চলাচল",
      open: "খুলুন",
      close: "বন্ধ",
      copy: "অনুলিপি",
      copied: "অনুলিপি হয়েছে",
      onThisPage: "এই পাতায়",
      previous: "পূর্ববর্তী",
      next: "পরবর্তী",
      toTop: "উপরে ফিরুন",
      noResults: "কিছু মেলেনি। অন্য শব্দ দিয়ে চেষ্টা করুন।",
      minChars: "অন্তত দুটি অক্ষর লিখুন।",
      readingTime: "মিনিট পড়ার সময়",
      sourceDoc: "মূল ARCHITECTURE.md",
      allChapters: "সব অধ্যায়",
      wordCount: "শব্দ",
      sections: "অংশ",
      legacy: "এই অধ্যায় ছাপুন",
      sourceNote: "ইংরেজি ও বাংলা সংস্করণে বিষয়বস্তু একই। হেডারের EN / বাংলা বোতাম দিয়ে যেকোনো ভাষায় পড়ুন; আপনার পছন্দ মনে রাখা হবে।",
      provenanceText: "এই সাইটটি `ARCHITECTURE.md` (২,০১৭ লাইন)-কে ব্রাউজযোগ্য, সার্চযোগ্য, দ্বিভাষিক রূপে সাজানো একটি সম্প্রসারিত রূপান্তর। এখানে কিছুই বানানো নয়: প্রতিটি সংখ্যা, টেবিল ও কোড তালিকা সেই নথি থেকেই নেওয়া। *সম্প্রসারিত* চিহ্নিত অধ্যায়গুলো সেই নথির চেয়ে এগিয়ে যায় — এগুলো একই উৎসভূতিক উপকরণ থেকে তৈরি অতিরিক্ত লেখা, এবং তা স্পষ্টভাবে চিহ্নিত করা আছে। এখানে বর্ণিত জাভা সোর্স ফাইলগুলো এই রিপোজিটরিতে নেই, তাই সব কোড উদ্ধৃতি মূল নথিতে মুদ্রিত সেগুলোই।",
      part: {
        start: "এখান থেকে শুরু",
        foundations: "ভিত্তি",
        code: "আর্কিটেকচার ও কোড",
        runtime: "ডেটা, রানটাইম ও পারফরম্যান্স",
        ops: "যুক্তি ও পরিচালনা",
        reference: "রেফারেন্স",
        extended: "সম্প্রসারিত নির্দেশিকা"
      }
    }
  };
})(window);
