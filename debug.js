
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
Error(errorText_In)
{
  console.log(`%cError: ${errorText_In}`, 'color:rgb(202, 49, 43)');
  return null;
}

// NOTE: These two should kill the program.
export function
Assert()
{
  return null;
}

export function
Abort(abortText_In)
{
  // TODO: Abort should create an HTML element that displays the failure message and reason that the program cant cotinue.
  try {
    throw new abortMsg(`${errorText_In}\n\nExecution aborted.`);
  } catch {
    Error(abortMsg);
  }
  return null;
}