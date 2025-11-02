import express from "express"
import fs from "fs"
import path from "path"
import { format } from "date-fns"
import showdown from "showdown"

const app = express()
const port = 3000
const root = "/Users/antonio/school/"

showdown.extension("wikilinks", function () {
    return [
        {
            type: "lang",
            regex: /\[\[(.*?)\]\]/g,
            replace: (text, inner, opts) => {
                const [dir, file] = inner.split("/")

                const details = parseFileName(file)
                const href = `/${dir}/${details.name}`

                return `<a href="${href}">${inner}</a>`
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

app.get("/:dir/:noteName", (req, res) => {
    const { dir, noteName } = req.params

    const files = fs.readdirSync(path.join(root, dir))
    const details = files.map(parseFileName)

    const noteDetails = details.find((d) => d.name === noteName)
    if (!noteDetails) {
        res.status(404)
        res.send(`Can not find path: ${dir}/${noteName}\n`)
        return
    }

    const data = fs.readFileSync(path.join(root, dir, noteDetails.getPath()), {
        encoding: "utf-8",
    })
    const converter = new showdown.Converter({ extensions: ["wikilinks"] })
    const html = converter.makeHtml(stripFrontmatter(data.toString()))

    res.send(html)
})

app.get("/", (req, res) => {
    console.log(showdown.getAllExtensions())
    res.send("Hello World!")
})

app.use(express.static(path.join(root, "public")))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
