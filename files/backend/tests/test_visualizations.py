import pytest
from fastapi.testclient import TestClient
from ..main import app
from .. import models
import numpy as np

client = TestClient(app)

@pytest.fixture
def mock_db_session(mocker):
    # Mock SQLAlchemy session
    session = mocker.Mock()
    mocker.patch('backend.database.get_db', return_value=session)
    return session

@pytest.fixture
def mock_auth_user(mocker):
    # Mock authenticated user
    user = models.User(id=1, external_id="test-user")
    mocker.patch('backend.auth.get_current_user', return_value=user)
    return user

def test_get_visualizations(mock_db_session, mock_auth_user):
    # Mock visualization data
    mock_visualization = models.Visualization(
        id=1,
        embedding_id=1,
        method="umap",
        dimensions=2,
        coordinates=[[1.0, 2.0], [3.0, 4.0]],
        clusters=[0, 1]
    )
    
    mock_db_session.query.return_value.join.return_value.join.return_value \
        .join.return_value.filter.return_value.all.return_value = [mock_visualization]

    response = client.get("/api/visualizations/1")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["method"] == "umap"

def test_export_visualization(mock_db_session, mock_auth_user):
    # Mock visualization data
    mock_visualization = models.Visualization(
        id=1,
        embedding_id=1,
        method="umap",
        dimensions=2,
        coordinates=[[1.0, 2.0], [3.0, 4.0]],
        clusters=[0, 1]
    )
    
    mock_db_session.query.return_value.join.return_value.join.return_value \
        .join.return_value.filter.return_value.first.return_value = mock_visualization

    # Test CSV export
    response = client.get("/api/visualizations/1/export?format=csv")
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/csv"
    
    # Test JSON export
    response = client.get("/api/visualizations/1/export?format=json")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"