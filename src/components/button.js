import styled from "@emotion/styled";

const Button = styled('span')`
  cursor: pointer;
  color: ${props =>
    props.reversed
        ? props.active ? 'white' : '#aaa'
        : props.active ? 'black' : '#ccc'};
`


export default Button;