import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Feedback } from '..';
import { Form } from 'react-bootstrap';
import { noOutputTextAreaValue } from './constants';

const OutputTextAreaWrapper = styled.div`
    > textarea {
        width: 100%;
    }
`;

const NoOutputCheckbox = styled(Form.Check)`
    display: inline-block;
    float: right;
    color: ${props => (props.disabled ? '#7F7F7F' : 'inherit')};
    > input {
        cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
        margin-right: 4px;
    }
`;

const OutputTextArea = ({ commandIndex, atOutput, isSubmitted }) => {
    const [noOutput, setNoOutput] = useState(
        atOutput.value === noOutputTextAreaValue
    );

    const isMounted = useRef(false);

    useEffect(() => {
        if (isMounted.current) {
            if (noOutput) {
                atOutput.change(noOutputTextAreaValue);
            } else {
                atOutput.change('');
            }
        } else {
            isMounted.current = true;
        }
    }, [noOutput]);

    useEffect(() => {
        setNoOutput(atOutput.value === noOutputTextAreaValue);
    }, [atOutput.value]);

    return (
        <OutputTextAreaWrapper>
            <label htmlFor={`speechoutput-${commandIndex}`}>
                {atOutput.description[0]}
                {isSubmitted && (
                    <Feedback
                        className={`${
                            atOutput.description[1].required && 'required'
                        } ${
                            atOutput.description[1].highlightRequired &&
                            'highlight-required'
                        }`}
                    >
                        {atOutput.description[1].description}
                    </Feedback>
                )}
            </label>
            <NoOutputCheckbox
                checked={noOutput}
                disabled={
                    atOutput.value && atOutput.value !== noOutputTextAreaValue
                }
                label="No output"
                id={`no-output-checkbox-${commandIndex}`}
                type="checkbox"
                onChange={() => setNoOutput(!noOutput)}
            />
            <textarea
                key={`SpeechOutput__textarea__${commandIndex}`}
                id={`speechoutput-${commandIndex}`}
                autoFocus={isSubmitted && atOutput.focus}
                value={atOutput.value}
                onChange={e => atOutput.change(e.target.value)}
                disabled={noOutput}
            />
        </OutputTextAreaWrapper>
    );
};

OutputTextArea.propTypes = {
    commandIndex: PropTypes.number.isRequired,
    atOutput: PropTypes.shape({
        description: PropTypes.arrayOf(
            PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.shape({
                    required: PropTypes.bool.isRequired,
                    highlightRequired: PropTypes.bool.isRequired,
                    description: PropTypes.string.isRequired
                })
            ])
        ).isRequired,
        value: PropTypes.string.isRequired,
        change: PropTypes.func.isRequired,
        focus: PropTypes.bool.isRequired
    }).isRequired,
    isSubmitted: PropTypes.bool.isRequired
};

export default OutputTextArea;
