import { h } from "preact"
import { resolveRelative } from "@quartz-community/utils/path"

const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

// Read the author's calendar date, without shifting it to the visitor's time zone.
export function calendarDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    value = value.toISOString()
  }
  if (typeof value !== "string") return null
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
  const named = value.trim().match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/)
  let year, month, day
  if (iso) {
    ;[, year, month, day] = iso.map(Number)
  } else if (named) {
    year = Number(named[3])
    month = monthNames.findIndex((name) => name === named[1].toLowerCase()) + 1
    day = Number(named[2])
  } else {
    return null
  }
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return null
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function groupArticles(files) {
  const groups = new Map()
  for (const file of files) {
    const slug = file.slug
    if (!slug || slug === "index" || slug.endsWith("/index") || slug === "404") continue
    if (slug.startsWith("tags/") || file.unlisted === true || file.frontmatter?.draft === true)
      continue
    const date = calendarDate(file.frontmatter?.date ?? file.frontmatter?.Date)
    const key = date?.slice(0, 7) ?? "undated"
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: date ? `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月` : "未注明日期",
        articles: [],
      })
    }
    groups.get(key).articles.push({ slug, title: file.frontmatter?.title ?? slug, date })
  }
  return [...groups.values()]
    .sort((a, b) =>
      a.key === "undated" ? 1 : b.key === "undated" ? -1 : b.key.localeCompare(a.key),
    )
    .map((group) => ({
      ...group,
      articles: group.articles.sort(
        (a, b) =>
          (b.date ?? "").localeCompare(a.date ?? "") ||
          a.title.localeCompare(b.title, "zh-CN", { numeric: true }) ||
          a.slug.localeCompare(b.slug),
      ),
    }))
}

export function MonthlyExplorer() {
  const Component = ({ allFiles, fileData, displayClass }) => {
    const groups = groupArticles(allFiles)
    return h(
      "details",
      { class: ["monthly-explorer", displayClass].filter(Boolean).join(" "), open: true },
      h("summary", { class: "monthly-explorer-title" }, "按月归档"),
      h(
        "nav",
        { class: "month-groups", "aria-label": "按年月浏览文章" },
        groups.map((group, index) =>
          h(
            "details",
            {
              class: "month-group",
              "data-month": group.key,
              open:
                group.articles.some((article) => article.slug === fileData.slug) ||
                (fileData.slug === "index" && index === 0),
            },
            h(
              "summary",
              null,
              h("span", null, group.label),
              h(
                "span",
                { class: "month-count", "aria-label": `${group.articles.length}篇文章` },
                group.articles.length,
              ),
            ),
            h(
              "ul",
              null,
              group.articles.map((article) =>
                h(
                  "li",
                  null,
                  h(
                    "a",
                    {
                      href: resolveRelative(fileData.slug, article.slug),
                      class: "internal" + (article.slug === fileData.slug ? " active" : ""),
                      "aria-current": article.slug === fileData.slug ? "page" : undefined,
                    },
                    article.title,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    )
  }

  Component.css = `
.monthly-explorer { min-height: 0; flex: 0 1 auto; }
.monthly-explorer summary { cursor: pointer; user-select: none; }
.monthly-explorer-title { color: var(--dark); font-family: var(--headerFont); font-weight: 700; font-size: 1rem; }
.monthly-explorer summary:focus-visible { outline: 2px solid var(--secondary); outline-offset: 3px; border-radius: 3px; }
.monthly-explorer .month-groups { margin-top: .6rem; overflow-y: auto; max-height: calc(100dvh - 18rem); }
.monthly-explorer .month-group { margin: .3rem 0 .6rem; }
.monthly-explorer .month-group > summary { color: var(--secondary); font-weight: 600; font-size: .95rem; line-height: 1.6; }
.monthly-explorer .month-count { margin-left: .6rem; font-weight: 400; font-size: .8rem; color: var(--gray); }
.monthly-explorer ul { list-style: none; margin: .4rem 0 .5rem .3rem; padding: 0 0 0 .9rem; border-left: 1px solid var(--lightgray); }
.monthly-explorer li { margin: .35rem 0; }
.monthly-explorer a { color: var(--darkgray); font-size: .95rem; line-height: 1.45; overflow-wrap: anywhere; background: none; }
.monthly-explorer a:hover, .monthly-explorer a.active { color: var(--tertiary); }
@media (max-width: 800px) {
  #quartz-body .sidebar.left:has(.monthly-explorer) { flex-wrap: wrap; gap: .75rem; }
  .monthly-explorer { flex: 0 0 100%; width: 100%; }
  .monthly-explorer .month-groups { max-height: 50dvh; padding-bottom: .5rem; }
}
`

  Component.afterDOMLoaded = `
document.addEventListener("nav", () => {
  const storageKey = "monthly-explorer-open-months";
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(storageKey) || "{}") || {}; } catch {}
  for (const explorer of document.querySelectorAll(".monthly-explorer")) {
    explorer.open = !window.matchMedia("(max-width: 800px)").matches;
    for (const group of explorer.querySelectorAll(".month-group")) {
      const key = group.dataset.month;
      if (group.querySelector('[aria-current="page"]')) group.open = true;
      else if (typeof saved[key] === "boolean") group.open = saved[key];
      const remember = () => {
        saved[key] = group.open;
        try { sessionStorage.setItem(storageKey, JSON.stringify(saved)); } catch {}
      };
      group.addEventListener("toggle", remember);
      window.addCleanup(() => group.removeEventListener("toggle", remember));
    }
  }
});
`
  return Component
}
