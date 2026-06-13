import { css } from "lit";

const globalStyles = css`
  * {
    box-sizing: border-box;
  }

  :host {
    font-family: var(--primary-font-family);
  }

  button {
    padding: 12px 24px;
    background-color: var(--app-primary-color);
    color: white;
    border: none;
    border-radius: var(--app-border-radius);
    cursor: pointer;
    font-size: 14px;
    font-family: var(--primary-font-family);
    transition: opacity 0.2s;
  }

  button:hover {
    opacity: 0.9;
  }

  button.secondary {
    background-color: white;
    color: var(--app-primary-color);
    border: 1px solid var(--app-primary-color);
  }

  input {
    width: 100%;
    padding: 12px;
    margin: 8px 0;
    border: 1px solid var(--app-light-grey);
    border-radius: var(--app-border-radius);
    font-size: 16px;
    font-family: var(--primary-font-family);
  }

  input:focus {
    outline: none;
    border-color: var(--app-primary-color);
  }

  label {
    display: block;
    margin-top: 12px;
    margin-bottom: 4px;
    font-weight: 500;
    color: var(--app-primary-color);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  a {
    color: var(--app-primary-color);
    text-decoration: none;
    cursor: pointer;
  }

  a:hover {
    text-decoration: underline;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
    color: var(--app-primary-color);
  }

  p {
    margin: 8px 0;
    line-height: 1.5;
  }
`;

export default globalStyles;
