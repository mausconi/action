import PropTypes from 'prop-types';
import React from 'react';
import {
  Avatar,
  Button,
  Row,
  RowActions,
  RowInfo,
  RowInfoHeader,
  RowInfoHeading,
  RowInfoCopy
} from 'universal/components';
import {TagBlock, TagPro} from 'universal/components/Tag';
import defaultOrgAvatar from 'universal/styles/theme/images/avatar-organization.svg';
import {PERSONAL, PRO, PRO_LABEL} from 'universal/utils/constants';
import withRouter from 'react-router-dom/es/withRouter';
import plural from 'universal/utils/plural';
import styled from 'react-emotion';

const OrgAvatar = styled('div')({
  cursor: 'pointer'
});

const Name = styled(RowInfoHeading)({
  cursor: 'pointer'
});

const StyledTagBlock = styled(TagBlock)({
  marginLeft: '.125rem',
  marginTop: '-.5rem'
});

const OrganizationRow = (props) => {
  const {
    history,
    organization: {
      id: orgId,
      name,
      orgUserCount: {
        activeUserCount,
        inactiveUserCount
      },
      picture,
      tier
    }
  } = props;
  const orgAvatar = picture || defaultOrgAvatar;
  const onRowClick = () => history.push(`/me/organizations/${orgId}`);
  const totalUsers = activeUserCount + inactiveUserCount;
  const upgradeCTALabel = <span>{'Upgrade to '}<b>{PRO_LABEL}</b></span>;
  return (
    <Row>
      <OrgAvatar onClick={onRowClick}>
        <Avatar size="fill" picture={orgAvatar} />
      </OrgAvatar>
      <RowInfo>
        <RowInfoHeader>
          <Name onClick={onRowClick}>
            {name}
            {tier === PRO &&
            <StyledTagBlock>
              <TagPro />
            </StyledTagBlock>
            }
          </Name>
        </RowInfoHeader>
        <RowInfoCopy useHintCopy>
          {`${totalUsers} ${plural(totalUsers, 'User')} (${activeUserCount} Active)`}
        </RowInfoCopy>
      </RowInfo>
      <RowActions>
        {tier === PERSONAL &&
          <Button
            buttonStyle="flat"
            colorPalette="warm"
            label={upgradeCTALabel}
            onClick={onRowClick}
            buttonSize="small"
          />
        }
        <Button
          buttonStyle="flat"
          colorPalette="dark"
          label="Settings and Billing"
          icon="cog"
          onClick={onRowClick}
          buttonSize="small"
        />
      </RowActions>
    </Row>
  );
};

OrganizationRow.propTypes = {
  history: PropTypes.object.isRequired,
  organization: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    picture: PropTypes.string,
    tier: PropTypes.string.isRequired,
    orgUserCount: PropTypes.shape({
      activeUserCount: PropTypes.number.isRequired,
      inactiveUserCount: PropTypes.number.isRequired
    }).isRequired
  }).isRequired
};

export default withRouter(OrganizationRow);
