import { transferAction, getBalanceAction, deployTokenAction } from "./actions";

export const abstractPlugin = {
	name: "abstract",
	description: "Abstract Plugin for Eliza",
	actions: [transferAction, getBalanceAction, deployTokenAction],
	evaluators: [],
	providers: [],
};

export default abstractPlugin;
