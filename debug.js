
/** @param {string} errorText_In */
export function
Debug(errorText_In)
{
  console.log(`%c${errorText_In}`, 'color:rgb(80, 142, 214)');
  return null;
}

/** @param {string} errorText_In */
export function
Warn(errorText_In)
{
  console.log(`%cWarning: ${errorText_In}`, 'color:rgb(210, 144, 96)');
  return null;
}

/** @param {string} errorText_In */
export function 
Fatal(errorText_In)
{
  if(errorText_In)
    console.log(`%cFatal error: ${errorText_In}`, 
                'color:rgb(202, 49, 43)');
  return null;
}

// NOTE: These two should kill the program.
/**
* @param {boolean} condition_In 
* @param {string} errorText_In 
* @returns 
*/
export function
Assert(condition_In, errorText_In)
{
  if(condition_In != true)
  {
    if(errorText_In)
      console.log(`%cError: ${errorText_In}`, 'color:rgb(202, 49, 43)');
    Abort("Assertion failure.");
  }
  return null;
}

/** @param {string} abortText_In */
export function
Abort(abortText_In)
{
  // TODO: Abort should create an HTML element that displays the failure message and reason that the program cant cotinue.
  throw new Error(`${abortText_In}\n\nExecution aborted.`);
}