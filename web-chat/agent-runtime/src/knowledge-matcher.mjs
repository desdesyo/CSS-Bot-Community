const STOP = new Set([
  "это","что","как","для","или","при","про","там","тут","мне","меня","мы","вы","ты","он","она","они","его","её","быть","есть",
  "без","над","под","после","перед","когда","если","тогда","ли","же","бы","вот","уже","ещё","тоже","можно","нужно","надо","какой","какая","какие","который","которую","которые","чтобы","подскажи","пожалуйста","помоги","хочу","нужна","нужен","нужны",
  "the","and","for","with","that","this","from","you","your","reply","exactly","nothing","else","call","tools","tool","do","not","only","please","answer","tell","user","current","request","context","solo","chat"
]);
const SYNONYMS = [
  ["windows","виндовс","винда","винду","винде","виндой"],
  ["usb","флешка","флешку","флешки","флешкой","накопитель","накопителя"],
  ["dism","дисм"],
  ["sfc","сфс"],
  ["восстановить","восстановление","восстановлению","восстановлением","восстановил","восстанови","восстановл"],
  ["библиотека","библиотеки","библиотек","библиотекам","библиотекой","dll"],
  ["файл","файлы","файлов","файлами","данные","данных"],
  ["геймпад","контроллер","джойстик"],
  ["наушник","наушники","наушников"]
];
const SYNONYM_MAP = new Map();
for (const group of SYNONYMS) {
  const values = new Set(group);
  for (const value of group) SYNONYM_MAP.set(value, values);
}
const SUFFIXES = [
  "иями","ями","ами","иями","ение","ения","ению","ением","ениях","ений","остью","ости","овать","ировать",
  "ого","ему","ыми","ими","ее","ие","ые","ое","ей","ий","ый","ой","ая","яя","ою","ею","ам","ям","ах","ях",
  "ов","ев","ом","ем","ть","ет","ют","ит","ат","ят","ы","и","а","я","у","ю","е","о"
].sort((a,b)=>b.length-a.length);

function stem(token) {
  if (token.length <= 4) return token;
  for (const suffix of SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) return token.slice(0, -suffix.length);
  }
  return token;
}
function variants(token) {
  const base = stem(token);
  const group = SYNONYM_MAP.get(token) || SYNONYM_MAP.get(base);
  const out = new Set([token, base]);
  if (group) for (const item of group) { out.add(item); out.add(stem(item)); }
  return out;
}
export function normalizeKnowledgeTokens(value) {
  const raw = String(value || "").toLocaleLowerCase("ru").match(/[a-zа-яё0-9_]{2,}/giu) || [];
  return [...new Set(raw.filter(token => !STOP.has(token)).map(token => stem(token)).filter(token => token.length >= 2 && !STOP.has(token)))];
}
export function rankKnowledgeEntries(prompt, entries) {
  const queryTokens = normalizeKnowledgeTokens(prompt);
  if (!queryTokens.length) return [];
  const queryMarkers = [...new Set(String(prompt || "").match(/\b[A-Z][A-Z0-9_]{5,}\b/g) || [])];
  const ranked = (Array.isArray(entries) ? entries : []).filter(entry =>
    !entry?.reviewRequired && entry?.reviewStatus !== "pending" && entry?.reviewStatus !== "rejected"
  ).map(entry => {
    const storedQuestion = String(entry?.queryText || "");
    const entryMarkers = [...new Set(storedQuestion.match(/\b[A-Z][A-Z0-9_]{5,}\b/g) || [])];
    if (queryMarkers.length && (!entryMarkers.length || !queryMarkers.some(marker => entryMarkers.includes(marker)))) {
      return { entry, score: 0, coverage: 0, overlap: 0, answer: "", answerUsable: false };
    }
    const entryTokens = new Set(normalizeKnowledgeTokens(storedQuestion));
    const entryVariants = new Set([...entryTokens].flatMap(token => [...variants(token)]));
    let overlap = 0;
    for (const token of queryTokens) {
      if ([...variants(token)].some(candidate => entryVariants.has(candidate))) overlap++;
    }
    const coverage = overlap / queryTokens.length;
    const precision = overlap / Math.max(1, entryTokens.size);
    const normalizedPrompt = String(prompt || "").toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/giu, " ").trim();
    const normalizedQuestion = storedQuestion.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/giu, " ").trim();
    const phraseBonus = normalizedPrompt.length >= 12 &&
      (normalizedQuestion.includes(normalizedPrompt) || normalizedPrompt.includes(normalizedQuestion)) ? 0.2 : 0;
    const score = Math.min(1, coverage * 0.82 + Math.min(precision, 0.5) * 0.18 + phraseBonus);
    const match = String(entry?.content || "").match(/Ответ SOLO\.Chat:\s*([\s\S]*)$/i);
    const answer = String(match?.[1] || "").trim();
    const answerUsable = answer.length >= 24 && answer.length <= 7000 &&
      !/не удалось получить ответ от ии-модели|ошибка провайдера|provider capacity exhausted|внутренняя ошибка сервера/i.test(answer);
    const minimumOverlap = queryTokens.length <= 2 ? 1 : Math.max(2, Math.ceil(queryTokens.length * 0.3));
    return { entry, score, coverage, overlap, answer, answerUsable, minimumOverlap };
  }).filter(item => item.answerUsable && item.overlap >= item.minimumOverlap && item.coverage >= 0.3 && item.score >= 0.3)
    .sort((a,b) => b.score - a.score);
  return ranked;
}
export function selectKnowledgeEntry(prompt, entries) {
  const ranked = rankKnowledgeEntries(prompt, entries);
  const best = ranked[0], second = ranked[1];
  if (!best || (second && best.score - second.score < 0.045 && best.entry.queryText !== second.entry.queryText)) return null;
  return best;
}
