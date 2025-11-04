import express from "express"
import fs from "fs"
import path from "path"
import { format } from "date-fns"
import showdown from "showdown"
import Handlebars from "handlebars"
import assert from "assert"
import { dbInit, searchNotes } from "./db.js"
import "showdown-youtube"

const app = express()
const port = 3000
const root = "/Users/antonio/school/"
const db = dbInit(path.join(root, ".zk/notebook.db"))
console.log("this is the db", db)

assert(!!db, "db is null")

const templateFile = fs.readFileSync(path.join(process.cwd(), "template.html"))
const precomplied = Handlebars.compile(templateFile.toString("utf8"))

const searchTemplateFile = fs.readFileSync(
    path.join(process.cwd(), "searchPage.html")
)
const precompiledSearch = Handlebars.compile(
    searchTemplateFile.toString("utf8")
)

const dirTemplateFile = fs.readFileSync(
    path.join(process.cwd(), "dirTemplate.html")
)
const precompliedDir = Handlebars.compile(dirTemplateFile.toString("utf8"))

const test = showdown.extension("wikilinks", function () {
    return [
        {
            type: "lang",
            regex: /\[\[([^\|\]]+)(?:\|(.*?))?\]\]/,
            replace: (text, inner, displayName, opts) => {
                const [dir, file] = inner.split("/")

                const details = parseFileName(file)
                const href = `/${dir}/${details.name}`

                return `<a href="${href}">${displayName}</a>`
            },
        },
    ]
})
// "{{id}}-{{format-date now '%Y-%m-%d'}}-{{slug title}}"
const parseFileName = (noteName) => {
    const [id, y, m, d, ...parts] = noteName.split("-")
    const [name, ext] = parts.join("-").split(".")

    return {
        id: id,
        createdAt: new Date(parseInt(y), parseInt(m) - 1, parseInt(d)),
        name: name,
        ext: ext,

        getPath() {
            const name = this.name + "." + this.ext
            const date = format(this.createdAt, "yyyy-MM-dd")
            return [id, date, name].join("-")
        },
    }
}

function stripFrontmatter(markdown) {
    const frontmatterRegex = /^---\s*[\s\S]*?\s*---(?=\n|$)/
    return markdown.replace(frontmatterRegex, "").trim()
}

app.get("/search", (req, res) => {
    const query = req.query.query

    const searchResults = searchNotes(db, query).map((r) =>
        parseNotePath(r.path)
    )
    console.log(searchResults)

    res.send(
        precompiledSearch({
            results: searchResults.map((r) => ({
                path: r.dir + "/" + r.note.name,
                title: r.note.name,
            })),
        })
    )
})

const parseNotePath = (path) => {
    // 50008-Switching-and-Logic-Design/b5fc-2025-11-02-bases.md
    const [dir, note] = path.split("/")

    return {
        dir,
        note: parseFileName(note),
    }
}

app.get("/:dir/:noteName", (req, res) => {
    const { dir, noteName } = req.params

    const files = fs.readdirSync(path.join(root, dir))
    const details = files.map(parseFileName)

    const noteDetails = details.find((d) => d.name === noteName)
    if (!noteDetails) {
        // res.status(404)
        // res.send(`Can not find path: ${dir}/${noteName}\n`)
        res.sendFile(path.join(root, dir, noteName))
        return
    }

    const data = fs.readFileSync(path.join(root, dir, noteDetails.getPath()), {
        encoding: "utf-8",
    })
    const converter = new showdown.Converter({
        extensions: ["wikilinks", "youtube"],
    })
    const html = converter.makeHtml(stripFrontmatter(data.toString()))

    res.send(precomplied({ content: html }))
})

app.get("/:dir", (req, res) => {
    const { dir } = req.params

    const fileNames = fs.readdirSync(path.join(root, dir))
    const files = fileNames.map(parseFileName).filter((f) => f.ext === "md")

    res.send(
        precompliedDir({
            files: files.map((f) => ({
                name: f.name,
                path: path.join(dir, f.name),
            })),
            dir,
        })
    )
})

app.get("/", (req, res) => {
    // const fileNames = fs
    //     .readdirSync(path.join(root))
    //     .filter((f) => !f.startsWith("."))
    // console.log(fileNames)

    res.sendFile(path.resolve("./homepage.html"))
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
