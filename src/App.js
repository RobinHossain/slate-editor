import React, { Component } from 'react';
// import logo from './logo.svg';
import './App.css';
import SlateEditor from './SlateEditor';


class App extends Component {
  render() {
    return (
      <div className="App">
          <div className="MainEditor">
            <SlateEditor/>
          </div>
      </div>
    );
  }
}

export default App;
