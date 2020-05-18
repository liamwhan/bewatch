import fs = require("fs");
import path = require("path");
import { EventEmitter } from "events";
import { sync as glob } from "globby";
import Callsite from "callsite";
import { Options as FastGlobOptions } from 'fast-glob';
import { EOL } from "os";

export interface FSWatchOptions {
    encoding?: string;
    persistent?: boolean;
    recursive?: boolean;
}

export interface WatcherStruct {
    target: string;
    watcher: fs.FSWatcher;
}

export interface FSEventLock {
    filename: string;
    lockTime: number;
}

export interface FileDescriptor {
    basename: string;
    fd: number;
    dirname: string;
    absolute: string;
}

export interface WatcherOptions extends FSWatchOptions, FastGlobOptions {
    /**
     * The delay in milliseconds before emitting a new Event
     * NodeJS fs.watch emits duplicate events among other idiosyncrases, this controls how long we wait before relaying events
     * @default 5000
     */
    lockDuration?: number;

    /**
     * Enables verbose logging
     * @default false
     */
    verbose?: boolean;
}

export interface DescriptorDirectory {
    dirname: string;
    descriptors: FileDescriptor[];
}

// Add the unique extension method to the Array prototype
declare global {
    interface Array<T> {
        unique: () => Array<T>;
    }
}

if (!Array.prototype.unique) {
    Array.prototype.unique = function () {
        return this.filter((value: any, index: number) => {
            return this.indexOf(value) === index;
        });
    }
}

export type LegalEvents = "add" | "delete" | "change" | "rename" | "all";

export class Bewatch extends EventEmitter {
    protected files: string[];
    protected directories: string[];
    protected options: WatcherOptions = { lockDuration: 1000, absolute: true, encoding: "utf-8", persistent: true, recursive: true, verbose: false };
    protected watchers: WatcherStruct[] = [];
    protected locked: boolean = false;
    protected locks: FSEventLock[] = [];

    /**
     * File Watching using NodeJS fs.watch
     * @param globPattern The glob or array of globs to match against
     * @param watchOptions Options object 
     */
    constructor(globPattern: string | string[], watchOptions: WatcherOptions = {}) {
        super();
        this.options = { ...this.options, ...watchOptions };

        // Callsite Gets the directory of the file this constructor was called from so we can glob from there instead of here
        this.options.cwd = (typeof this.options.cwd === "undefined") ? path.dirname(Callsite()[1].getFileName()) : this.options.cwd;

        this.log("Working Directory", this.options.cwd);
        this.log("Options", this.options);

        this.files = this.globFiles(globPattern).map((g) => path.normalize(g));
        this.directories = this.files.map((f) => path.dirname(f)).unique();


    }

    protected log(...logargs: any[]): void {
        if (this.options.verbose) {
            // tslint:disable-next-line:no-console
            console.log(`Bewatch::${Callsite()[1].getFunctionName()}`, ...logargs, EOL);
        }
    }

    protected globFiles(globPattern: string | string[]): string[] {
        return glob(globPattern, this.options);
    }

    protected isDirectory(source: string): boolean {
        return fs.lstatSync(source).isDirectory();
    }

    protected isFile(source: string): boolean {
        return !fs.lstatSync(source).isDirectory();
    }

    protected getDirectories(source: string): string[] {
        return fs.readdirSync(source).map((name: string) => path.normalize(path.join(source, name))).filter(this.isDirectory);
    }

    protected getFiles(dir: string):string[] {
        return fs.readdirSync(dir).map((name: string) => path.normalize(path.join(dir, name))).filter(this.isFile);
    }

    protected onFileEvent(e: string, f: string): void {
        if (this.locked || e !== "change") { return; }
        this.lock();

        this.log(`Node.js FSEvent: ${e}`,`Node FSEvent File: ${f}`);
        this.emit("all", "change", f);
        this.emit("change", f);
    }

    /**
     * fs.watch event handler for directories
     * We watch directories for add, rename delete events so we can add and remove new listeners as necessary
     * 
     * @param e {string} event type
     * @param f {string} file
     * @param dir {string} the directory
     */
    protected onDirectoryEvent(e: string, f: string, dir: string): void {
        if (this.locked || e !== "rename") { return; }
        this.lock();

        this.log(`Raw FSEvent: ${e}${EOL}Raw FSEvent File: ${f}${EOL}Directory: ${dir}${EOL}`);
        const abs = path.join(dir, path.basename(f));
        if (!fs.existsSync(abs)) {
            
            const renamedFile = this.getRenamedFiles(dir);
            if (typeof renamedFile !== "undefined") {
                this.log(`Old File: ${abs}`)
                this.log(`Renamed File: ${renamedFile}`)
                this.emit("all", "rename", abs, renamedFile);
                this.emit("rename", abs, renamedFile);
                this.removeWatcher(abs);
            } else {
                this.emit("all", "delete", abs);
                this.emit("delete", abs);
            }
            return;
        }
        
        if (!this.files.includes(abs)) {
            // Create
            this.watchers.push(this.createFileWatcher(abs));
            this.emit("all", "add", abs);
            this.emit("add", abs);
        }
    }

    protected removeWatcher(file: string): void {
        const watcherStruct = this.getWatcher(file);
        if (typeof watcherStruct !== "undefined") { 
            watcherStruct.watcher.close();
            this.watchers.splice(this.watchers.indexOf(watcherStruct), 1);
        }
    }

    protected getRenamedFiles(dir: string): string {
        const files = this.getFiles(dir);
        this.log("Files on Disk:" + EOL + JSON.stringify(files, null, 2));
        this.log("Watched Files:" + EOL + JSON.stringify(this.files, null, 2));
        for (const f of files) {
            if (!this.files.includes(f)) { return f; }
        }
        return undefined;

    }

    protected createFileWatcher(file: string): WatcherStruct {
        return {
            target: file,
            watcher: fs.watch(file, this.options, (e: string, _) => { this.onFileEvent(e, file); })
        };
    }
    protected createDirWatcher(dir: string): WatcherStruct {
        return {
            target: dir,
            watcher: fs.watch(dir, this.options, (e: string, f: string) => { this.onDirectoryEvent(e, f, dir); })
        };
    }

    protected getWatcher(filename: string): WatcherStruct {
        return this.watchers.find((w) => path.normalize(w.target) === path.normalize(filename));
    }
    
    protected lock(): void {
        this.locked = true;
        setTimeout(() => { this.locked = false; }, this.options.lockDuration);
    }


    /**
     * Attachs watch listeners and starts watching specified files
     * Available events are 
     * `add` - Emitted when a file is created
     * `delete` - Emitted when a file is deleted
     * `change` - Emitted when a file change is detected 
     * `rename` - Emitted when a file is renamed
     * `all` - Emitted for all the above events
     */
    public Start(): this {
        this.log("Watching Files:" + EOL + this.files.map((f) => `${f}`).join(EOL));
        for (const file of this.files) {
            this.watchers.push(this.createFileWatcher(file));
        }
        this.log("Watching Directories:" + EOL + this.directories.map((f) => `${f}`).join(EOL));
        for (const dir of this.directories) {
            this.watchers.push(this.createDirWatcher(dir));
        }

        return this;
    }
}
