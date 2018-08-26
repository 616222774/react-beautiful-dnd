// @flow
import React from 'react';
import Example from '../../examples/basic';
import Layout from '../../components/layouts/example';

export default ({ location }) => (
  <Layout location={location} examplePath="src/examples/basic.jsx">
    <Example />
  </Layout>
);
