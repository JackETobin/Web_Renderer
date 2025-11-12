import {Debug, Warn, Fatal, Assert, Abort} from '../debug.js';

import { Maze } from '../Maze/maze.js';

export class
Application {
    /** @type boolean} */
    initialized = false;

    /** @type Maze */
    #maze = null;

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
    // TODO: Strip this when mazes are implemented.
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

    /**
     * @param {number} cellWidth_In
     * @param {number} cellHeight_In  
     * @param {function} pfnButtonCallback_In */
    async init(cellWidth_In, cellHeight_In, pfnButtonCallback_In)
    {
        this.#maze = new Maze();
        const header = document.getElementById('head');
        const title = document.createElement('title');
                        
        try {
          await this.#maze.init(cellWidth_In, cellHeight_In);
          title.innerText = "Maze";
          header.appendChild(title);
        } catch(e) {
          title.innerText = "Not Maze";
          header.appendChild(title);
          this.#l_Kill(`Fatal error:/n${e}`);
        };
         // TODO: Strip this when mazes are implemented.
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