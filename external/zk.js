import utils from "util"
import { exec as execCallback } from "child_process"

const ZK_CMD = "zk"
const COMMON_FLAGS = ["--no-input", "--quiet"]

const exec = utils.promisify(execCallback)

export class ZK {
    #notebookPath = ""
    #commonFlags = COMMON_FLAGS
    constructor(notebookPath) {
        this.#notebookPath = notebookPath
        this.#commonFlags = [...this.#commonFlags, "-W", this.#notebookPath]
    }

    async search(query) {
        if (!query) {
            this.#report("You must pass a query to search!")
            return null
        }

        return this.getAll(query)
    }

    async getNote(notePath) {
        const [dir, name] = notePath.split("/")

        const { stdout, stderr } = await exec(this.#listCmd([dir]))
        if (!stdout || stderr) {
            this.#report(stderr ?? `Could not find file in ${notePath}`)
            return null
        }

        const files = JSON.parse(stdout).map(this.#parseResult)

        return files.find((f) => f.title.toLowerCase() === name.toLowerCase())
    }

    async getAll(query = "") {
        try {
            const { stdout, stderr } = await exec(this.#searchCmd(query))

            if (!!stderr) {
                this.#report(stderr)
                return null
            }

            return JSON.parse(stdout).map(this.#parseResult)
        } catch (e) {
            this.#report(e)
            return null
        }
    }

    #parseResult(v) {
        const [dir] = v.path.split("/")

        return {
            title: v.title.toLowerCase(),
            fileName: v.filename,
            path: [dir, v.title].join("/"),
            content: v.rawContent,
        }
    }

    #report(err) {
        console.error("[ZK] Error: ", err)
    }

    #listCmd(flags) {
        return [
            ZK_CMD,
            "list",
            ...this.#commonFlags,
            ...flags,
            "-f",
            "json",
        ].join(" ")
    }

    #searchCmd(query) {
        const queryFlag = []
        if (query) {
            queryFlag.push("-m", query)
        }

        console.log("searching with ", queryFlag)
        return this.#listCmd(queryFlag)
    }
}

// const zk = new ZK("/Users/antonio/school/")
//
// zk.getNote("4201-Physics-101/Kinematics").then((v) => console.log(v))
