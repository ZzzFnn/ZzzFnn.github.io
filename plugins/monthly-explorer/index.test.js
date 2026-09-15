import assert from "node:assert/strict"
import test from "node:test"
import { h } from "preact"
import render from "preact-render-to-string"
import { calendarDate, groupArticles, MonthlyExplorer } from "./index.js"

const article = (slug, date, extra = {}) => ({ slug, frontmatter: { title: slug, date }, ...extra })

test("uses calendar dates in both existing formats and across time zones", () => {
  assert.equal(calendarDate("June 22, 2026"), "2026-06-22")
  assert.equal(calendarDate("2026-09-01"), "2026-09-01")
  assert.equal(calendarDate("2026-09-01T00:30:00+14:00"), "2026-09-01")
  assert.equal(calendarDate("2024-02-29"), "2024-02-29")
  for (const value of [undefined, null, "", "wrong", "2026-02-29", "2026-04-31", "2026-13-01"]) {
    assert.equal(calendarDate(value), null)
  }
})

test("creates only populated months, newest first, and uses date rather than modified time", () => {
  const groups = groupArticles([
    article("index", "2026-08-01"),
    article("early", "June 4, 2026", { dates: { modified: new Date("2027-01-01") } }),
    article("late", "2026-06-30"),
    article("new", "2027-01-01"),
    article("old", "April 26, 2026"),
    article("hidden", "2026-10-01", { unlisted: true }),
  ])
  assert.deepEqual(
    groups.map((g) => g.label),
    ["2027年1月", "2026年6月", "2026年4月"],
  )
  assert.deepEqual(
    groups[1].articles.map((a) => a.slug),
    ["late", "early"],
  )
  assert.equal(groupArticles([]).length, 0)
})

test("date changes regroup an article and missing dates do not hide it", () => {
  const file = article("changed", "2026-06-01")
  file.frontmatter.date = "2026-07-01"
  const groups = groupArticles([file, article("undated"), article("invalid", "not-a-date")])
  assert.deepEqual(
    groups.map((g) => g.key),
    ["2026-07", "undated"],
  )
  assert.equal(groups[1].articles.length, 2)
})

test("renders accessible month folders and preserves Chinese article URLs", () => {
  const html = render(
    h(MonthlyExplorer(), {
      allFiles: [article("007_思考", "2026-07-09"), article("notes/002_科研", "2026-06-22")],
      fileData: { slug: "007_思考" },
    }),
  )
  assert.match(html, /data-month="2026-07" open/)
  assert.match(html, /aria-current="page"/)
  assert.match(html, /href="\.\/007_思考"/)
  assert.match(html, /href="\.\/notes\/002_科研"/)
  assert.doesNotMatch(html, /data-month="2026-08"/)
})
