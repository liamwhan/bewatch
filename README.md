# Bewatch
> Simple Node.js file watcher written in Typescript. 

## Fair Warning
This module uses Node.js native `fs.watch()`. This will mean it wont be fit for purpose for most users (Google `node fs.watch issues`), but I created it for my own purposes as a simple alternative to `chokidar`.
That said, it works perfectly for me so feel free to use it.


## Installation

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


## Details
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
* `oldFilename` String - The path of the file that triggered the event *(or the old path if a `'rename'` event is emitted)*
* `newFilename` String? - *Only emitted on `rename` events* The new path of the file


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


