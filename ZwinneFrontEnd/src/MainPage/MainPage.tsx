import React, { useState } from 'react';
import Main from './components/main';
import MidPanel from './components/mid';
import Top from './components/top';

function MainPanel() {

    return (
        <>
            <Top />
            <Main />
            <MidPanel />
        </>
    )
}
export default MainPanel;