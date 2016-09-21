import expect from 'chai';

describe('Testing the Posts and Get methods', () => {
	it('The post method posts variables from URL', () => {
		const total = sum(3, 7);
		expect(total).to.equal(10);
	});

	it('The get method should get results from URL', () => {
		const example = new Example();
		const result = example.toUpper('appc');
		expect(result).to.equal('APPC');
	});
});