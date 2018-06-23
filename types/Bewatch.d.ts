/// <reference types="node" />
import fs = require("fs");
import { EventEmitter } from "events";
import { Options as FastGlobOptions } from 'fast-glob';
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
declare global {
    interface Array<T> {
        unique: () => Array<T>;
    }
}
export declare type LegalEvents = "add" | "delete" | "change" | "rename" | "all";
export declare class Bewatch extends EventEmitter {
    protected files: string[];
    protected directories: string[];
    protected options: WatcherOptions;
    protected watchers: WatcherStruct[];
    protected locked: boolean;
    protected locks: FSEventLock[];
    /**
     * File Watching using NodeJS fs.watch
     * @param globPattern The glob or array of globs to match against
     * @param watchOptions Options object
     */
    constructor(globPattern: string | string[], watchOptions?: WatcherOptions);
    protected log(...logargs: any[]): void;
    protected globFiles(globPattern: string | string[]): string[];
    protected isDirectory(source: string): boolean;
    protected isFile(source: string): boolean;
    protected getDirectories(source: string): string[];
    protected getFiles(dir: string): string[];
    protected onFileEvent(e: string, f: string): void;
    /**
     * fs.watch event handler for directories
     * We watch directories for add, rename delete events so we can add and remove new listeners as necessary
     *
     * @param e {string} event type
     * @param f {string} file
     * @param dir {string} the directory
     */
    protected onDirectoryEvent(e: string, f: string, dir: string): void;
    protected removeWatcher(file: string): void;
    protected getRenamedFiles(dir: string): string;
    protected createFileWatcher(file: string): WatcherStruct;
    protected createDirWatcher(dir: string): WatcherStruct;
    protected getWatcher(filename: string): WatcherStruct;
    protected lock(): void;
    /**
     * Attachs watch listeners and starts watching specified files
     * Available events are
     * `add` - Emitted when a file is created
     * `delete` - Emitted when a file is deleted
     * `change` - Emitted when a file change is detected
     * `rename` - Emitted when a file is renamed
     * `all` - Emitted for all the above events
     */
    Start(): this;
}
