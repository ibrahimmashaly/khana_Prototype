import React, { Component } from 'react'

import { Pane, Alert, Button, Text } from 'evergreen-ui'

class Grants extends Component {

    render() {
        let tokenName = this.props.state.contract.tokenName

        return( 
            <Pane padding={8} flex="1">
                <Pane marginBottom={16}>
                    <Alert
                        intent="none"
                        title={"Grants are ways to earn " + this.props.state.contract.tokenSymbol + " tokens"}
                    >
                        View the list of grants below to find out ways you can earn tokens for contributing to the community.
                    </Alert>
                </Pane>
                <Pane margin={16}>
                    <Text>This section is still under construction. In the meantime, use the below link to view the grants list for {tokenName}</Text>
                    <p></p>
                    <Pane align="center">
                        <Button 
                            iconBefore="link"
                            onClick={() => {
                                let url = this.props.grantsUrl
                                window.open(url, "_blank")
                            }}
                            >
                            Open Grants List
                        </Button>
                    </Pane>
                </Pane>

            </Pane>
        )
    }
}

export default Grants