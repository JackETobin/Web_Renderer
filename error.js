function ShowError(errorText_In)
{
  const errorBox = document.getElementById('error-box');
  const errorText = document.createElement('p');
  errorText.innerText = errorText_In;
  errorBox.appendChild(errorText);
  console.log(errorText_In);
}

export { ShowError };