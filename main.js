import { Application } from './App/app.js';

let l_App = null;

main();

/** @param {api_obj} api */
async function 
main(api)
{
  l_App = new Application();
  await l_App.init(64, 64, ButtonCallback);
}

function
ButtonCallback(button_In)
{ l_App.input(button_In); }