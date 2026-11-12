# Interface translations

`core.json` is the required navigation, gallery, account and growth vocabulary. Every offered locale must translate every core phrase. The original English and Chinese dictionaries and the priority Japanese/German/French/Spanish packs also cover longer explanatory text. Other locales use English fallback for untranslated secondary text; settings disclose that fallback. User titles, tags and posts are preserved verbatim.

Each module exports an object keyed by BCP 47 language tag, whose values are ordinary English-phrase → localized-string dictionaries. Brand name is cc&hp and never translated. `src/i18n.js` combines packs. Locale labels use each language's native name. Arabic, Persian, Hebrew and Urdu set document direction to RTL.
