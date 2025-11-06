import express from "express"
import fs from "fs"
import path from "path"
import { format } from "date-fns"
import showdown from "showdown"
import Handlebars from "handlebars"
import "showdown-youtube"
import { ZK } from "./external/zk.js"

const app = express()
const port = 3000
const root = "/Users/antonio/school/"

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

showdown.extension("wikilinks", function () {
    return [
        {
            type: "lang",
            regex: /\[\[([^\|\]]+)(?:\|(.*?))?\]\]/,
            replace: (_text, inner, displayName, _opts) => {
                const [dir, file] = inner.split("/")

                const details = parseFileName(file)
                const href = `/${dir}/${details.name}`

                return `<a href="${href}">${displayName}</a>`
            },
        },
    ]
})

// TODO: GET RID OF THIS FUNCTION!!
const parseFileName = (noteName) => {
    // "{{id}}-{{format-date now '%Y-%m-%d'}}-{{slug title}}"
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

app.get("/notes/search", async (req, res) => {
    const query = req.query.query

    const zk = new ZK(root)
    const results = await zk.search(query)

    res.send(
        precompiledSearch({
            results,
        })
    )
})

app.get("/notes/:dir/:noteName", async (req, res) => {
    const { dir, noteName } = req.params
    const p = [dir, noteName].join("/")

    const zk = new ZK(root)

    const note = await zk.getNote(p)
    if (!note) {
        res.status(404)
        res.send(`Can not find path: ${dir}/${noteName}\n`)
        return
    }

    const converter = new showdown.Converter({
        extensions: ["wikilinks", "youtube"],
    })
    const html = converter.makeHtml(stripFrontmatter(note.content))

    res.send(precomplied({ content: html }))
})

app.get("/notes/:dir", (req, res) => {
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
    res.sendFile(path.resolve("./homepage.html"))
})

app.get(express.static("public"))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
