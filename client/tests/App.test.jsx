import React from 'react';
import Enzyme, { shallow } from 'enzyme';
import EnzymeAdapter from 'enzyme-adapter-react-16';

import App from '../components/App';
import routes from '../routes';

Enzyme.configure({ adapter: new EnzymeAdapter() });

test('renders without crashing', () => {
    const wrapper = shallow(<App route={{ routes }} />);
    expect(wrapper).toBeTruthy();
});
