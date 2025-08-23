import {Debug, Warn, Fatal, Assert, Abort} from '../debug.js';

import { Maze } from '../Maze/maze.js';

export class
Application {
    /** @type boolean} */
    initialized = false;

    /** @type Maze */
    #maze = null;

    /** @type number */
    #cellWidth = 32;

    /** @type number */
    #cellHeight = 32;

    #pointer_In(pointerX_In, pointerY_In)
    {
        Debug(`${toString(pointerX_In), toString(pointerY_In)}`);
        return;
    }

    /** @param {KeyboardEvent} b_Input */
    #button_In(b_Input)
    {
        Debug(b_Input.code);
        return;
    }

    async init()
    {
        this.#maze = new Maze();
        const header = document.getElementById('head');
        const title = document.createElement('title');
                        
        try {
          await this.#maze.init(this.#cellWidth, this.#cellHeight);
          title.innerText = "Maze";
          header.appendChild(title);
        } catch(e) {
          title.innerText = "Not Maze";
          header.appendChild(title);
          this.#l_Kill(`Fatal error:/n${e}`);
        };

        window.addEventListener('keydown', this.#button_In, false);
        return;
    }

    async run()
    {
        this.#maze.fill(119);
        this.#maze.draw();
    }

    #l_Kill(killMessage_In)
    {
        if(errorText_In)
            Fatal(errorText_In);
        return null;
    }
}