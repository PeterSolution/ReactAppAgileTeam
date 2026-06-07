import React, { useState } from 'react';
import Main from './components/main';
import Mid from './components/mid';
import Top from './components/top';

function MainPanel() {

    return (
        <>
            <Top />
            <Mid />
            <Main />
        </>
    )
}
export default MainPanel;