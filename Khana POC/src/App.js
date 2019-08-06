import React from 'react'
import { HashRouter, Route } from "react-router-dom";
import Khana from './Communities/Khana';
import BlockDam from './Communities/BlockDam';
import BuidlAms from './Communities/BuidlAms';
import Shiatsu from './Communities/Shiatsu';
import BlockchainTalks from './Communities/BlockchainTalks';

const KhanaComponent = () => (
    <Khana />
)

const BlockDamComponent = () => (
    <BlockDam />
)

const BuidlAmsComponent = () => (
    <BuidlAms />
)

const ShiatsuComponent = () => (
    <Shiatsu />
)

const BlockchainTalksComponent = () => <BlockchainTalks />;

const BasicRoute = () => (
	<HashRouter basename="/dapp">
		<div>
			<Route exact path="/" component={KhanaComponent} />
			<Route path="/blockdam" component={BlockDamComponent} />
			<Route path="/buidlams" component={BuidlAmsComponent} />
			<Route path="/shiatsu" component={ShiatsuComponent} />
			<Route path="/bct" component={BlockchainTalksComponent} />
		</div>
	</HashRouter>
);

export default BasicRoute;

// Remember to create .htaccess file: https://stackoverflow.com/a/38827810/4769084 if not hosting on Github Pages