// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef} from 'react';
import styled from 'styled-components';
import moment from 'moment';
import {useIntl} from 'react-intl';
import {useDrop} from 'react-dnd';
import {useDispatch} from 'react-redux';

import {WorkBlock} from 'types/time_management';
import {PixelPerMinute, DragTypes} from 'utils/time_management/constants';
import {findAvailableSlot} from 'utils/time_management/utils';
import {updateWorkBlocks} from 'actions/time_management';

import Block from './block';
import Hour from './hour';

const CalendarContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin: 0px 10px;
    padding: 24px;
    background-color: #FFFFFF;
    border-radius: 8px;
`;

const CalendarTitle = styled.div`
    font-family: Metropolis;
    font-size: 14px;
    line-height: 24px;
    margin-bottom: 20px;
    font-weight: 600;
`;

const Body = styled.div`
    display: flex;
    width: 900px;
    height: 1200px;
    flex-direction: column;
    position: relative;
`;

const BodyContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: row;
`;

const HourContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

type Props = {
    date: Date;
    blocks: WorkBlock[];
    dayStart: Date;
    dayEnd: Date;
}

const min = new Date();
min.setHours(8, 0, 0, 0);

const max = new Date();
max.setHours(19, 0, 0, 0);

const defaultProps = {
    dayStart: min,
    dayEnd: max,
};

const Calendar = (props: Props) => {
    const {date, dayStart, dayEnd, blocks: defaultBlocks} = props;
    const {formatDate} = useIntl();
    const dispatch = useDispatch();
    const [blocks, setBlocks] = useState(defaultBlocks);

    let workingHours = dayEnd.getHours() - dayStart.getHours();
    if (workingHours <= 0) {
        workingHours = 8;
    }

    const moveBlock = (time: Date, block: WorkBlock) => {
        const blockIndex = blocks.findIndex((b) => block.id === b.id);
        if (blockIndex < 0) {
            return;
        }

        const newBlocks = [...blocks];
        const newBlock = {...block, start: time};
        newBlocks.splice(blockIndex, 1);

        const newBlocksDates = newBlocks.map((block) => block.start);
        const indexOfBlockAtSameTime = newBlocksDates.findIndex((d) => d.getTime() === time.getTime());
        if (indexOfBlockAtSameTime >= 0) {
            const blockAtSameTime = newBlocks[indexOfBlockAtSameTime];
            newBlocks.splice(indexOfBlockAtSameTime, 1);
            newBlocks.push(newBlock);
            const newStart = findAvailableSlot(blockAtSameTime, newBlocks);
            const newBlockAtSameTime = {...blockAtSameTime, start: newStart};
            newBlocks.push(newBlockAtSameTime);
        } else {
            newBlocks.push(newBlock);
        }

        setBlocks(newBlocks);
        dispatch(updateWorkBlocks(newBlocks, date));
    };

    const updateBlock = (block: WorkBlock) => {
        const index = blocks.findIndex((b) => b.id === block.id);
        if (index < 0) {
            return;
        }

        const newBlocks = [...blocks];
        newBlocks.splice(index, 1, block);
        setBlocks(newBlocks);
        dispatch(updateWorkBlocks(newBlocks, date));
    };

    const ref = useRef(null);

    const [{handlerId}, drop] = useDrop({
        accept: DragTypes.BLOCK,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        drop(item: any, monitor) {
            if (!ref.current) {
                return;
            }

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const clientOffset = monitor.getClientOffset();
            if (clientOffset == null) {
                return;
            }

            const offsetY = clientOffset.y - hoverBoundingRect.top;
            if (offsetY < 0) {
                return;
            }

            const totalMinutesFromStart = offsetY / PixelPerMinute;
            const hoursFromStart = Math.floor(totalMinutesFromStart / 60);
            const hours = dayStart.getHours() + hoursFromStart;

            const minutesFromStart = totalMinutesFromStart % 60;
            const halfHour = (Math.floor(minutesFromStart / 30) * 30) % 60;

            const newDate = new Date(date);
            newDate.setHours(hours, halfHour, 0, 0);

            moveBlock(newDate, item.block);
        },
    });

    const renderHours = () => {
        const hours = [];
        let cursor = dayStart;
        while (dayEnd.getHours() - cursor.getHours() > 0) {
            hours.push(
                <Hour
                    key={cursor.toDateString()}
                    date={cursor}
                />,
            );
            cursor = moment(cursor).add(1, 'hours').toDate();
        }
        return (
            <BodyContainer
                ref={ref}
                data-handler-id={handlerId}
            >
                <HourContainer>
                    {hours}
                    {blocks.map((block) => (
                        <Block
                            key={block.id}
                            block={block}
                            dayStart={dayStart}
                            updateBlock={updateBlock}
                        />),
                    )}
                </HourContainer>
            </BodyContainer>
        );
    };

    drop(ref);
    return (
        <CalendarContainer>
            <CalendarTitle>
                {formatDate(date, {month: 'long', weekday: 'long', day: 'numeric'})}
            </CalendarTitle>
            <Body>
                {renderHours()}
            </Body>
        </CalendarContainer>
    );
};

Calendar.defaultProps = defaultProps;

export default Calendar;
