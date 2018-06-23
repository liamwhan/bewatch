# Bewatch
> Simple Node.js file watcher written in Typescript. 

## Fair Warning
This module uses Node.js native `fs.watch()`. This will mean it wont be fit for purpose for most users (Google `node fs.watch issues`), but I created it for my own purposes as a simple alternative to `chokidar`.
That said, it works perfectly for me so feel free to use it.


## Installation
- Node.js 8.11.x recommended.

```shell
npm i -S bewatch@git+https://github.com/hammus/bewatch.git
```
## Quick Start

The `Bewatch` class extends `EventEmitter` so you just add listeners like you would with any other `EventEmitter`. 
```javascript
const {Bewatch} = require("bewatch");

// Create a watcher
const watcher = new Bewatch(["./folder/**/*"]);

// Add some listeners
watcher.on("change", (file) => console.log(file, "was changed.".))
watcher.on("add", (file) => console.log(file, "was created".))
watcher.on("delete", (file) => console.log(file, "was deleted".))
watcher.on("rename", (oldFilename, newFilename) => console.log(oldFilename, "was renamed to", newFilename));
```

With Options
```javascript
const {Bewatch} = require("bewatch");

// Create a watcher
const watcher = new Bewatch(["./folder/**/*"], {verbose: true, cwd: "C:/MyProject"});

// Add some listeners
watcher.on("change", (file) => console.log(file, "was changed.".))
```

Or listen for everything

```javascript
const { Bewatch } = require("bewatch");

// Create a watcher
const watcher = new Bewatch(["./folder/**/*"]);

// Add some listeners
watcher.on("all", (event, file, newFile) =>{
    if (event === "rename") { 
        // newFile will be undefined on any event other than "rename"
        console.log(file, "was renamed to", newFile); 
    } else {
        console.log("Event:", event, "File:", file);
    }
})

```

## Details

This was developed for Node.js 8.11.x, once 10 moves into LTS we will be able to use the `interval` option, so Bewatch will be much less useful as thats the main benefit Bewatch offers.


### Options
The `options` object will *accept an pass on* and options that the following dependencies use:
- `fast-glob` - Bewatch uses `globby` for file pattern matching but `globby` uses `fast-glob` under the hood, see [Fast Glob Options](https://github.com/mrmlnc/fast-glob#options-1)
- `fs.watch` - The options object will pass on options to `fs.watch` see [fs.Watch Options](https://nodejs.org/docs/latest-v8.x/api/fs.html#fs_fs_watch_filename_options_listener)

#### Bewatch Options
There are only 2 options that are specific to bewatch
- `verbose` Boolean
    - Default: `false`
    - When enabled Bewatch will run in verbose mode
- `lockDuration` Number
    - Default: 1000,
    - The interval to wait before firing the next event (without this, Node.js will send 2 events for just about everything)


### Instance Events

#### Event `'change'`
Emitted when a file is changed in a watched directory

Returns:
* `file` String - The path of the file that was changed


#### Event `'add'` 
Emitted when a file is created in a watched directory

Returns:
* `file` String - The path of the file that was created


#### Event `'delete'` 
Emitted when a file is deleted in a watched directory

Returns:
* `file` String - The path of the file that was deleted


#### Event `'rename'` 
Emitted when a file is renamed in a watched directory

Returns:
* `oldFilename` String - The original path of the file before renaming
* `newFilename` String - The new path of the file

#### Event `'all'` 
Emitted when any event is emitted

Returns:
* `event` String - The event type that was emitted.
* `file` String - The path of the file that triggered the event *(or the old path if a `'rename'` event is emitted)*
* `newFile` String? - *Only emitted on `rename` events* The new path of the file


### Implementation Info

Node's `fs.watch` emits only 2 event types:
* `'change'` - emitted when a file has changed (identical in semantics to Bewatch's `'change'` event)
* `'rename'` - Emitted when a file is created, deleted, renamed

The `'rename'` Event is a little tricky, if a file has actually been renamed in the sense the user understands it, we recieve the **new filename** from `fs.watch`.
So Bewatch constructs some lookup tables to determine which type of event occured. When `fs.watch` emits `'rename'` the control flow looks roughly like this:

1. Check whether the file exists in the directory, if `true` then its a newly created file and Bewatch adds a Watcher for the new file and emits the `'add'` event with the new filename
2. If the file doesn't exist Bewatch needs to determine if its a rename or a deletion:
3. First Bewatch reglobs the files in the watched directory, then compare it to the existing list of watched files
4. If there is a new file in the watched directory, then Bewatch finds the file that's missing and remove it's watcher, a new watcher is added for the renamed file and the `'rename'` event is emitted with both filenames
5. If there is no new file then Bewatch emits `'delete'`


## Licence
```
MIT License

Copyright (c) 2018 Liam Whan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```


