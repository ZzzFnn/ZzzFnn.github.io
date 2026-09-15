import { h } from "preact"
import { resolveRelative } from "@quartz-community/utils/path"
import { groupArticles } from "../monthly-explorer/index.js"

// New entries automatically fall back to a short excerpt of their rendered text.
export function articleSummary(file, summaries = {}) {
  const authored = file.frontmatter?.description || summaries[file.slug]
  if (authored) return String(authored).trim()
  const text = String(file.text ?? "")
    .replace(
      /&(?:amp|lt|gt|quot|#39);/g,
      (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[entity],
    )
    .replace(/\s+/g, " ")
    .trim()
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/g) ?? []
  const excerpt = sentences.slice(0, 2).join("")
  return excerpt.length > 110 ? excerpt.slice(0, 110).trimEnd() + "…" : excerpt
}

export function recentArticles(files, summaries = {}) {
  const bySlug = new Map(files.map((file) => [file.slug, file]))
  return groupArticles(files)
    .filter((group) => group.key !== "undated")
    .flatMap((group) => group.articles)
    .slice(0, 5)
    .map((article) => ({
      ...article,
      summary: articleSummary(bySlug.get(article.slug), summaries),
    }))
}

export function HomeRecent(options = {}) {
  return ({ fileData, allFiles }) => {
    if (fileData.slug !== "index") return null
    const articles = recentArticles(allFiles, options.summaries)
    return h(
      "section",
      { class: "home-recent", "aria-labelledby": "recent-heading" },
      h("h2", { id: "recent-heading" }, "最近写下"),
      h(
        "ol",
        { class: "recent-articles" },
        articles.map((article) => {
          const [year, month, day] = article.date.split("-")
          return h(
            "li",
            { key: article.slug },
            h("time", { dateTime: article.date }, `${year}年${Number(month)}月${Number(day)}日`),
            h(
              "h3",
              null,
              h(
                "a",
                { class: "internal", href: resolveRelative(fileData.slug, article.slug) },
                article.title,
              ),
            ),
            article.summary && h("p", null, article.summary),
          )
        }),
      ),
    )
  }
}
