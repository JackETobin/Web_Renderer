import {Debug, Warn, Error} from './debug.js';

import {Maze} from "./Maze/maze.js"

const TITLE = 'Maze';

const GRID_WIDTH = 32;
const GRID_HEIGHT = 32;
const GRID_MARGIN = 0.9;
const WORKGROUP_SIZE = 4;

main();

/** @param {api_obj} api */
async function 
main(api)
{
  const maze = new Maze();
  const header = document.getElementById('head');
  const title = document.createElement('title');
                
  try {
    await maze.init(GRID_WIDTH, GRID_HEIGHT);
    title.innerText = TITLE;
    header.appendChild(title);
  } catch(e) {
    title.innerText = 'Not ' + TITLE;
    header.appendChild(title);
    Error(`Error:/n${e}`);
  };

  maze.fill(119);
  maze.draw();
}