import {Debug, Warn, Fatal, Assert, Abort} from '../debug.js';

import { Maze } from '../Maze/maze.js';

export class
Application {
    /** @type boolean} */
    initialized = false;

    /** @type Maze */
    #maze = null;

    /** @type number */
    #cellWidth = 64;

    /** @type number */
    #cellHeight = 64;

    /** @type HTMLElement */
    #numberBox = null;

    #pointer_In(pointerX_In, pointerY_In)
    {
        Debug(`${toString(pointerX_In), toString(pointerY_In)}`);
        return;
    }

    #refill(number_In)
    {
        this.#maze.fill(number_In);
        this.#maze.draw();
        return;
    }

    /** @param {KeyboardEvent} b_Input */
    input(b_Input)
    {
        switch(b_Input.code)
        {
            case "Enter":
                let newNumber = this.#numberBox.value;
                this.#refill(newNumber);
        }
        return;
    }

    /** @param {function} pfnButtonCallback_In */
    async init(pfnButtonCallback_In)
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

        this.#numberBox = document.createElement("input");
        this.#numberBox.type = "number";
        this.#numberBox.min = "0";
        this.#numberBox.max = "255";
        document.body.appendChild(this.#numberBox);
        window.addEventListener('keydown', pfnButtonCallback_In, false);

        this.#maze.fill(255);
        this.#maze.draw();

        return;
    }

    #l_Kill(killMessage_In)
    {
        if(killMessage_In)
            Fatal(killMessage_In);
        return null;
    }
}