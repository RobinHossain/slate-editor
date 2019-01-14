import styled from "@emotion/styled";
import React from "react";

const Icon = styled(({ className, ...rest }) => {
    return <span className={`material-icons ${className}`} {...rest} />
})`
  font-size: 18px;
  vertical-align: text-bottom;
`

export default Icon;